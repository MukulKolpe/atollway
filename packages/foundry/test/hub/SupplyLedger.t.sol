// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";
import { HederaTokens } from "../../contracts/hedera/HederaTokens.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { InvestorRegister } from "../../contracts/hub/InvestorRegister.sol";
import { SpokeRegistry } from "../../contracts/hub/SpokeRegistry.sol";
import { SupplyLedger } from "../../contracts/hub/SupplyLedger.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { MockTransport } from "../mocks/MockTransport.sol";
import { HederaTest } from "../utils/HederaTest.sol";

contract SupplyLedgerHarness is SupplyLedger {
    constructor(address issuer) AssetToken(issuer) { }

    /// @notice Mints shares straight to `account`, standing in for a subscription.
    function issue(address account, uint256 amount) external {
        HederaTokens.mint(asset, amount);
        HederaTokens.transfer(asset, account, amount);
    }

    function _afterStatusChange(address, InvestorStatus, uint64) internal override { }
}

contract SupplyLedgerTest is HederaTest {
    uint64 internal constant BASE = 84_532;
    uint256 internal constant CAP = 1_000e6;
    uint256 internal constant FEE = 0.5e8;

    SupplyLedgerHarness internal hub;
    MockTransport internal transport = new MockTransport(FEE);
    address internal token;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");

    function setUp() public override {
        super.setUp();
        hub = new SupplyLedgerHarness(issuer);
        vm.deal(issuer, 100e8);
        vm.deal(alice, 100e8);
        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.addSpoke(BASE, transport, CAP);
        vm.stopPrank();
        token = hub.asset();
        _associate(token, alice);
        vm.prank(issuer);
        hub.approveInvestor(alice);
        hub.issue(alice, 500e6);
    }

    function test_sendToSpoke_burnsAndRecordsOutstanding() public {
        vm.prank(alice);
        hub.sendToSpoke{ value: FEE }(BASE, 200e6);

        assertEq(_balance(token, alice), 300e6);
        assertEq(hts.totalSupply(token), 300e6);
        (,, uint256 outstanding,) = hub.spokes(BASE);
        assertEq(outstanding, 200e6);
    }

    function test_sendToSpoke_sendsMintMessage() public {
        vm.prank(alice);
        bytes32 transferId = hub.sendToSpoke{ value: FEE }(BASE, 200e6);

        MockTransport.Sent memory sent = transport.lastSent();
        assertEq(sent.destinationId, BASE);
        assertEq(sent.fee, FEE);
        (uint8 kind, bytes memory payload) = Messages.decode(sent.message);
        (bytes32 id, address recipient, uint256 amount) = Messages.decodeTransfer(payload);
        assertEq(kind, Messages.MINT);
        assertEq(id, transferId);
        assertEq(recipient, alice);
        assertEq(amount, 200e6);
    }

    function test_sendToSpoke_transferIdsAreUnique() public {
        vm.startPrank(alice);
        bytes32 first = hub.sendToSpoke{ value: FEE }(BASE, 1e6);
        bytes32 second = hub.sendToSpoke{ value: FEE }(BASE, 1e6);
        assertTrue(first != second);
        assertEq(hub.transferCount(), 2);
    }

    function test_sendToSpoke_refundsExtraFee() public {
        vm.prank(alice);
        hub.sendToSpoke{ value: 1e8 }(BASE, 1e6);
        assertEq(alice.balance, 100e8 - FEE);
    }

    function test_sendToSpoke_respectsCap() public {
        vm.prank(issuer);
        hub.setSpokeCap(BASE, 100e6);
        vm.expectRevert(abi.encodeWithSelector(SupplyLedger.CapExceeded.selector, BASE, 0, 101e6, 100e6));
        vm.prank(alice);
        hub.sendToSpoke{ value: FEE }(BASE, 101e6);
    }

    function test_sendToSpoke_requiresApproval() public {
        vm.prank(issuer);
        hub.freezeInvestor(alice);
        vm.expectRevert(abi.encodeWithSelector(InvestorRegister.NotApproved.selector, alice));
        vm.prank(alice);
        hub.sendToSpoke{ value: FEE }(BASE, 1e6);
    }

    function test_sendToSpoke_rejectsZeroAmountAndUnknownSpoke() public {
        vm.startPrank(alice);
        vm.expectRevert(SupplyLedger.ZeroAmount.selector);
        hub.sendToSpoke{ value: FEE }(BASE, 0);
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.UnknownSpoke.selector, 1));
        hub.sendToSpoke{ value: FEE }(1, 1e6);
    }

    function test_sendToSpoke_cannotExceedBalance() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector,
                IHederaTokenService.wipeTokenAccount.selector,
                Codes.INVALID_WIPING_AMOUNT
            )
        );
        vm.prank(alice);
        hub.sendToSpoke{ value: FEE }(BASE, 501e6);
    }
}
