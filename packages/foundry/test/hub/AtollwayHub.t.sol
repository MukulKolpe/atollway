// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";
import { HederaTokens } from "../../contracts/hedera/HederaTokens.sol";
import { AtollwayHub } from "../../contracts/hub/AtollwayHub.sol";
import { SpokeRegistry } from "../../contracts/hub/SpokeRegistry.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { MockPriceFeed } from "../mocks/MockPriceFeed.sol";
import { MockTransport } from "../mocks/MockTransport.sol";
import { HederaTest } from "../utils/HederaTest.sol";

contract AtollwayHubTest is HederaTest {
    uint64 internal constant BASE = 84_532;
    uint64 internal constant ARBITRUM = 421_614;
    uint256 internal constant AXELAR_FEE = 0.5e8;
    uint256 internal constant CCIP_FEE = 0.25e8;
    uint256 internal constant BROADCAST_FEE = AXELAR_FEE + CCIP_FEE;

    AtollwayHub internal hub;
    MockPriceFeed internal feed;
    MockTransport internal axelar = new MockTransport(AXELAR_FEE);
    MockTransport internal ccip = new MockTransport(CCIP_FEE);
    address internal token;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public override {
        super.setUp();
        vm.warp(30 days);
        feed = new MockPriceFeed(8, 10_150_000);
        hub = new AtollwayHub(issuer, feed, 1 days);
        vm.deal(issuer, 100e8);
        vm.deal(alice, 10_000e8);
        vm.deal(bob, 10_000e8);

        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.setNav(1e8);
        hub.addSpoke(BASE, axelar, 1_000e6);
        hub.addSpoke(ARBITRUM, ccip, 1_000e6);
        vm.stopPrank();
        token = hub.asset();
        _associate(token, alice);
        _associate(token, bob);
    }

    function test_constructor() public view {
        assertEq(hub.owner(), issuer);
        assertEq(address(hub.hbarUsdFeed()), address(feed));
        assertEq(hub.maxPriceAge(), 1 days);
        assertFalse(hub.paused());
    }

    function test_approve_broadcastsComplianceToEverySpoke() public {
        assertEq(hub.quoteComplianceBroadcast(), BROADCAST_FEE);
        _approve(alice);

        _assertCompliance(axelar, BASE, alice, InvestorStatus.Approved, 1);
        _assertCompliance(ccip, ARBITRUM, alice, InvestorStatus.Approved, 1);
    }

    function test_approve_refundsExtraFee() public {
        vm.prank(issuer);
        hub.approveInvestor{ value: 1e8 }(alice);
        assertEq(issuer.balance, 100e8 - hts.CREATION_FEE() - BROADCAST_FEE);
    }

    function test_approve_rejectsInsufficientFee() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.InsufficientFee.selector, BROADCAST_FEE, AXELAR_FEE));
        vm.prank(issuer);
        hub.approveInvestor{ value: AXELAR_FEE }(alice);
    }

    function test_everyStatusChange_isBroadcast() public {
        _approve(alice);
        vm.startPrank(issuer);
        hub.freezeInvestor{ value: BROADCAST_FEE }(alice);
        _assertCompliance(axelar, BASE, alice, InvestorStatus.Frozen, 2);
        hub.unfreezeInvestor{ value: BROADCAST_FEE }(alice);
        _assertCompliance(axelar, BASE, alice, InvestorStatus.Approved, 3);
        hub.revokeInvestor{ value: BROADCAST_FEE }(alice);
        _assertCompliance(ccip, ARBITRUM, alice, InvestorStatus.Revoked, 4);
        vm.stopPrank();
        assertEq(axelar.sentCount(), 4);
        assertEq(ccip.sentCount(), 4);
    }

    function test_pause_pausesTokenAndBroadcasts() public {
        assertEq(hub.quotePauseBroadcast(), BROADCAST_FEE);
        vm.prank(issuer);
        hub.pause{ value: BROADCAST_FEE }();

        assertTrue(hub.paused());
        assertTrue(hts.isPaused(token));
        (uint8 kind, bytes memory payload) = Messages.decode(axelar.lastSent().message);
        assertEq(kind, Messages.PAUSE);
        assertTrue(Messages.decodePause(payload));

        vm.prank(issuer);
        hub.unpause{ value: BROADCAST_FEE }();
        assertFalse(hts.isPaused(token));
        (, payload) = Messages.decode(ccip.lastSent().message);
        assertFalse(Messages.decodePause(payload));
    }

    function test_pause_twiceReverts() public {
        vm.startPrank(issuer);
        hub.pause{ value: BROADCAST_FEE }();
        vm.expectRevert(abi.encodeWithSelector(AtollwayHub.PausedUnchanged.selector, true));
        hub.pause{ value: BROADCAST_FEE }();
    }

    function test_pause_blocksSubscriptionsAndApprovals() public {
        _approve(alice);
        vm.prank(issuer);
        hub.pause{ value: BROADCAST_FEE }();

        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector, IHederaTokenService.mintToken.selector, Codes.TOKEN_IS_PAUSED
            )
        );
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(0);

        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector,
                IHederaTokenService.grantTokenKyc.selector,
                Codes.TOKEN_IS_PAUSED
            )
        );
        _approve(bob);
    }

    function test_pause_onlyIssuer() public {
        vm.expectRevert();
        vm.prank(alice);
        hub.pause();
    }

    function test_resendCompliance_sendsCurrentStatusToOneSpoke() public {
        _approve(alice);
        _approve(bob);
        vm.prank(issuer);
        hub.freezeInvestor{ value: BROADCAST_FEE }(bob);

        address[] memory accounts = new address[](2);
        accounts[0] = alice;
        accounts[1] = bob;
        vm.prank(issuer);
        hub.resendCompliance{ value: 2 * CCIP_FEE }(ARBITRUM, accounts);

        uint256 count = ccip.sentCount();
        _assertComplianceAt(ccip, count - 2, ARBITRUM, alice, InvestorStatus.Approved, 1);
        _assertComplianceAt(ccip, count - 1, ARBITRUM, bob, InvestorStatus.Frozen, 2);
    }

    function test_resendCompliance_rejectsInsufficientFee() public {
        address[] memory accounts = new address[](2);
        accounts[0] = alice;
        accounts[1] = bob;
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.InsufficientFee.selector, 2 * CCIP_FEE, CCIP_FEE));
        vm.prank(issuer);
        hub.resendCompliance{ value: CCIP_FEE }(ARBITRUM, accounts);
    }

    /// @notice Subscribe on Hedera, move shares to two spokes and back, and check that the supply on Hedera
    /// plus the spokes' outstanding amounts always equals what was issued.
    function test_lifecycle_conservesSupply() public {
        _approve(alice);
        _approve(bob);
        vm.prank(alice);
        uint256 issued = hub.subscribe{ value: 1_000e8 }(0); // 101.5 shares
        vm.prank(bob);
        issued += hub.subscribe{ value: 500e8 }(0);
        _assertSupply(issued);

        vm.prank(alice);
        hub.sendToSpoke{ value: AXELAR_FEE }(BASE, 60e6);
        vm.prank(bob);
        hub.sendToSpoke{ value: CCIP_FEE }(ARBITRUM, 20e6);
        _assertSupply(issued);

        // Alice moved her spoke tokens to Bob on Base; Bob brings them home.
        axelar.deliver(hub, BASE, Messages.encodeTransfer(Messages.RELEASE, keccak256("base-1"), bob, 60e6));
        _assertSupply(issued);
        assertEq(_balance(token, bob), 50_750_000 - 20e6 + 60e6);

        (,, uint256 baseOutstanding,) = hub.spokes(BASE);
        (,, uint256 arbitrumOutstanding,) = hub.spokes(ARBITRUM);
        assertEq(baseOutstanding, 0);
        assertEq(arbitrumOutstanding, 20e6);
    }

    function testFuzz_sendAndRelease_conservesSupply(uint256 sent, uint256 returned) public {
        _approve(alice);
        vm.prank(alice);
        uint256 issued = hub.subscribe{ value: 1_000e8 }(0);
        sent = bound(sent, 1, issued);
        returned = bound(returned, 0, sent);

        vm.prank(alice);
        hub.sendToSpoke{ value: AXELAR_FEE }(BASE, sent);
        if (returned > 0) {
            axelar.deliver(hub, BASE, Messages.encodeTransfer(Messages.RELEASE, keccak256("r"), alice, returned));
        }
        _assertSupply(issued);
        assertEq(_balance(token, alice), issued - sent + returned);
    }

    function _approve(address account) internal {
        vm.prank(issuer);
        hub.approveInvestor{ value: BROADCAST_FEE }(account);
    }

    function _assertSupply(uint256 issued) internal view {
        (,, uint256 baseOutstanding,) = hub.spokes(BASE);
        (,, uint256 arbitrumOutstanding,) = hub.spokes(ARBITRUM);
        assertEq(hts.totalSupply(token) + baseOutstanding + arbitrumOutstanding, issued);
    }

    function _assertCompliance(
        MockTransport transport,
        uint64 spokeId,
        address account,
        InvestorStatus status,
        uint64 sequence
    ) internal view {
        _assertComplianceAt(transport, transport.sentCount() - 1, spokeId, account, status, sequence);
    }

    function _assertComplianceAt(
        MockTransport transport,
        uint256 index,
        uint64 spokeId,
        address account,
        InvestorStatus status,
        uint64 sequence
    ) internal view {
        MockTransport.Sent memory sent = transport.sent(index);
        assertEq(sent.destinationId, spokeId);
        (uint8 kind, bytes memory payload) = Messages.decode(sent.message);
        assertEq(kind, Messages.COMPLIANCE);
        (address decodedAccount, InvestorStatus decodedStatus, uint64 decodedSequence) =
            Messages.decodeCompliance(payload);
        assertEq(decodedAccount, account);
        assertEq(uint8(decodedStatus), uint8(status));
        assertEq(decodedSequence, sequence);
    }
}
