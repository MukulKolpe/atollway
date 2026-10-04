// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";
import { HederaTokens } from "../../contracts/hedera/HederaTokens.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { InvestorRegister } from "../../contracts/hub/InvestorRegister.sol";
import { HederaTest } from "../utils/HederaTest.sol";

contract InvestorRegisterHarness is InvestorRegister {
    struct Change {
        address account;
        InvestorStatus status;
        uint64 sequence;
    }

    Change[] public changes;

    constructor(address issuer) AssetToken(issuer) { }

    function changeCount() external view returns (uint256) {
        return changes.length;
    }

    function _afterStatusChange(address account, InvestorStatus status, uint64 sequence) internal override {
        changes.push(Change(account, status, sequence));
    }
}

contract InvestorRegisterTest is HederaTest {
    InvestorRegisterHarness internal hub;
    address internal token;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");

    function setUp() public override {
        super.setUp();
        hub = new InvestorRegisterHarness(issuer);
        vm.deal(issuer, 100e8);
        vm.prank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        token = hub.asset();
        _associate(token, alice);
    }

    function test_approve_grantsKyc() public {
        _approve(alice);

        assertEq(uint8(hub.statusOf(alice)), uint8(InvestorStatus.Approved));
        assertTrue(hub.isApproved(alice));
        assertTrue(hts.isKyc(token, alice));
    }

    function test_approve_requiresAssociation() public {
        address bob = makeAddr("bob");
        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector,
                IHederaTokenService.grantTokenKyc.selector,
                Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
            )
        );
        _approve(bob);
    }

    function test_approve_twiceReverts() public {
        _approve(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                InvestorRegister.InvalidStatusChange.selector, alice, InvestorStatus.Approved, InvestorStatus.Approved
            )
        );
        _approve(alice);
    }

    function test_revoke_removesKyc() public {
        _approve(alice);
        vm.prank(issuer);
        hub.revokeInvestor(alice);

        assertEq(uint8(hub.statusOf(alice)), uint8(InvestorStatus.Revoked));
        assertFalse(hts.isKyc(token, alice));
    }

    function test_approve_afterRevoke() public {
        _approve(alice);
        vm.prank(issuer);
        hub.revokeInvestor(alice);
        _approve(alice);

        assertTrue(hts.isKyc(token, alice));
        assertEq(hub.sequenceOf(alice), 3);
    }

    function test_statusChanges_areNumberedAndReported() public {
        _approve(alice);
        vm.prank(issuer);
        hub.revokeInvestor(alice);
        _approve(alice);

        InvestorStatus[3] memory expected = [InvestorStatus.Approved, InvestorStatus.Revoked, InvestorStatus.Approved];
        assertEq(hub.changeCount(), 3);
        for (uint256 i; i < 3; i++) {
            (address account, InvestorStatus status, uint64 sequence) = hub.changes(i);
            assertEq(account, alice);
            assertEq(uint8(status), uint8(expected[i]));
            assertEq(sequence, i + 1);
        }
    }

    function test_statusChange_emitsEvent() public {
        vm.expectEmit(address(hub));
        emit InvestorRegister.InvestorStatusChanged(alice, InvestorStatus.Approved, 1);
        _approve(alice);
    }

    function test_onlyIssuer() public {
        vm.expectRevert();
        hub.approveInvestor(alice);
    }

    function test_beforeAssetCreated_reverts() public {
        InvestorRegisterHarness fresh = new InvestorRegisterHarness(issuer);
        vm.expectRevert(AssetToken.AssetNotCreated.selector);
        vm.prank(issuer);
        fresh.approveInvestor(alice);
    }

    function _approve(address account) internal {
        vm.prank(issuer);
        hub.approveInvestor(account);
    }
}
