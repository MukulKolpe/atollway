// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { AtollwayHub } from "../../contracts/hub/AtollwayHub.sol";
import { SpokeGateway } from "../../contracts/spoke/SpokeGateway.sol";
import { SpokeToken } from "../../contracts/spoke/SpokeToken.sol";
import { AxelarTransport } from "../../contracts/transports/AxelarTransport.sol";
import { MockAxelarGasService, MockAxelarGateway, MockAxelarRelayer } from "../mocks/MockAxelar.sol";
import { MockPriceFeed } from "../mocks/MockPriceFeed.sol";
import { HederaTest } from "../utils/HederaTest.sol";

/// @notice The hub and a Base spoke, each with its own Axelar adapter and gateway, with a relayer standing in
/// for the Axelar network. Every message crosses the same contracts it would on testnet.
contract HubAndSpokeOverAxelarTest is HederaTest {
    uint64 internal constant HEDERA = 296;
    uint64 internal constant BASE = 84_532;
    uint256 internal constant HUB_FEE = 1e8; // tinybars, paid on Hedera
    uint256 internal constant SPOKE_FEE = 0.0005 ether; // wei, paid on Base

    AtollwayHub internal hub;
    SpokeGateway internal spoke;
    SpokeToken internal spokeToken;
    AxelarTransport internal hubTransport;
    AxelarTransport internal spokeTransport;
    MockAxelarGateway internal hederaGateway = new MockAxelarGateway();
    MockAxelarGateway internal baseGateway = new MockAxelarGateway();
    MockAxelarRelayer internal relayer = new MockAxelarRelayer();
    address internal asset;
    uint256 internal toSpoke;
    uint256 internal toHub;

    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public override {
        super.setUp();
        vm.warp(30 days);
        hub = new AtollwayHub(issuer, new MockPriceFeed(8, 10_150_000), 1 days);
        hubTransport = new AxelarTransport(hederaGateway, new MockAxelarGasService(), hub, issuer);
        spoke = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        spokeToken = spoke.token();
        spokeTransport = new AxelarTransport(baseGateway, new MockAxelarGasService(), spoke, issuer);

        vm.deal(issuer, 100e8);
        // One balance stands for both chains: HBAR in tinybars on Hedera, ETH in wei on Base.
        vm.deal(alice, 10_000e8 + 1 ether);
        vm.deal(bob, 10_000e8 + 1 ether);
        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.setNav(1e8);
        hubTransport.setRoute(BASE, "base-sepolia", address(spokeTransport), HUB_FEE);
        spokeTransport.setRoute(HEDERA, "hedera", address(hubTransport), SPOKE_FEE);
        spoke.setTransport(spokeTransport);
        hub.addSpoke(BASE, hubTransport, 1_000e6);
        vm.stopPrank();
        asset = hub.asset();

        _associate(asset, alice);
        _associate(asset, bob);
        _issuer(abi.encodeCall(hub.approveInvestor, (alice)));
        _issuer(abi.encodeCall(hub.approveInvestor, (bob)));
        _flush();
    }

    function test_approvals_reachTheSpoke() public view {
        assertTrue(spoke.isApproved(alice));
        assertTrue(spoke.isApproved(bob));
        assertEq(spoke.sequenceOf(alice), 1);
    }

    function test_roundTrip_conservesSupply() public {
        vm.prank(alice);
        uint256 issued = hub.subscribe{ value: 1_000e8 }(0);

        vm.prank(alice);
        hub.sendToSpoke{ value: HUB_FEE }(BASE, 60e6);
        _flush();
        assertEq(spokeToken.balanceOf(alice), 60e6);
        _assertSupply(issued);

        vm.prank(alice);
        assertTrue(spokeToken.transfer(bob, 25e6));

        vm.prank(bob);
        spoke.sendToHub{ value: SPOKE_FEE }(25e6);
        _flush();
        assertEq(_balance(asset, bob), 25e6);
        assertEq(spokeToken.balanceOf(bob), 0);
        _assertSupply(issued);
    }

    function test_freeze_stopsTransfersOnTheSpoke() public {
        _fundSpoke(alice, 10e6);
        _issuer(abi.encodeCall(hub.freezeInvestor, (alice)));
        _flush();

        vm.expectRevert(abi.encodeWithSelector(SpokeToken.NotApproved.selector, alice));
        vm.prank(alice);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        spokeToken.transfer(bob, 1);
    }

    function test_pause_stopsTheSpoke() public {
        _fundSpoke(alice, 10e6);
        _issuer(abi.encodeCall(hub.pause, ()));
        _flush();
        assertTrue(spoke.paused());

        _issuer(abi.encodeCall(hub.unpause, ()));
        _flush();
        vm.prank(alice);
        assertTrue(spokeToken.transfer(bob, 1));
    }

    function test_outOfOrderDelivery_keepsTheLatestStatus() public {
        _issuer(abi.encodeCall(hub.freezeInvestor, (alice)));
        _issuer(abi.encodeCall(hub.unfreezeInvestor, (alice)));
        uint256 last = hederaGateway.callCount() - 1;
        relayer.relay(hederaGateway, last, "hedera", baseGateway, spokeTransport); // unfreeze arrives first
        relayer.relay(hederaGateway, last - 1, "hedera", baseGateway, spokeTransport); // then the older freeze

        assertEq(uint8(spoke.statusOf(alice)), uint8(InvestorStatus.Approved));
        assertEq(spoke.sequenceOf(alice), 3);
    }

    function test_resendCompliance_bringsANewSpokeUpToDate() public {
        SpokeGateway late = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        AxelarTransport lateTransport = new AxelarTransport(baseGateway, new MockAxelarGasService(), late, issuer);
        vm.startPrank(issuer);
        late.setTransport(lateTransport);
        lateTransport.setRoute(HEDERA, "hedera", address(hubTransport), SPOKE_FEE);
        hubTransport.setRoute(BASE, "base-sepolia", address(lateTransport), HUB_FEE);
        address[] memory investors = new address[](2);
        investors[0] = alice;
        investors[1] = bob;
        hub.resendCompliance{ value: 2 * HUB_FEE }(BASE, investors);
        vm.stopPrank();

        uint256 count = hederaGateway.callCount();
        relayer.relay(hederaGateway, count - 2, "hedera", baseGateway, lateTransport);
        relayer.relay(hederaGateway, count - 1, "hedera", baseGateway, lateTransport);
        assertTrue(late.isApproved(alice));
        assertTrue(late.isApproved(bob));
    }

    function _issuer(bytes memory call) internal {
        uint256 fee = hub.quoteComplianceBroadcast();
        vm.prank(issuer);
        (bool ok, bytes memory reason) = address(hub).call{ value: fee }(call);
        if (!ok) {
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }

    function _fundSpoke(address investor, uint256 amount) internal {
        vm.prank(investor);
        hub.subscribe{ value: 1_000e8 }(0);
        vm.prank(investor);
        hub.sendToSpoke{ value: HUB_FEE }(BASE, amount);
        _flush();
    }

    /// @dev Delivers every message sent since the last flush, in both directions.
    function _flush() internal {
        for (; toSpoke < hederaGateway.callCount(); toSpoke++) {
            relayer.relay(hederaGateway, toSpoke, "hedera", baseGateway, spokeTransport);
        }
        for (; toHub < baseGateway.callCount(); toHub++) {
            relayer.relay(baseGateway, toHub, "base-sepolia", hederaGateway, hubTransport);
        }
    }

    function _assertSupply(uint256 issued) internal view {
        (,, uint256 outstanding,) = hub.spokes(BASE);
        assertEq(hts.totalSupply(asset) + outstanding, issued);
        assertEq(spokeToken.totalSupply(), outstanding);
    }
}
