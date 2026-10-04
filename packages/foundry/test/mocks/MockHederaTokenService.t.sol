// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";
import { MockHtsToken } from "./MockHederaTokenService.sol";
import { HederaTest } from "../utils/HederaTest.sol";

/// @notice Checks the mock returns the response codes Hedera testnet returned for the same calls.
contract MockHederaTokenServiceTest is HederaTest {
    address internal token;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public override {
        super.setUp();
        vm.deal(address(this), 100e8);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: 2 | 4 | 8 | 16 | 64, key: IHederaTokenService.KeyValue(false, address(this), "", "", address(0))
        });
        IHederaTokenService.HederaToken memory definition = IHederaTokenService.HederaToken({
            name: "Test",
            symbol: "TST",
            treasury: address(this),
            memo: "",
            tokenSupplyType: false,
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry(0, address(this), 7_776_000)
        });
        int64 code;
        (code, token) = hts.createFungibleToken{ value: CREATION_VALUE }(definition, 0, 6);
        assertEq(code, Codes.SUCCESS);
        hts.mintToken(token, 1000, new bytes[](0));
    }

    function test_create_refundsUnusedFee() public view {
        assertEq(address(this).balance, 100e8 - hts.CREATION_FEE());
    }

    function test_create_associatesTreasuryAndGrantsKyc() public view {
        assertTrue(hts.isAssociated(token, address(this)));
        assertTrue(hts.isKyc(token, address(this)));
    }

    function test_associate_twiceFails() public {
        vm.startPrank(alice);
        assertEq(MockHtsToken(token).associate(), uint256(int256(Codes.SUCCESS)));
        assertEq(MockHtsToken(token).associate(), uint256(int256(Codes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT)));
    }

    function test_grantKyc_requiresAssociation() public {
        assertEq(hts.grantTokenKyc(token, alice), Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT);
    }

    function test_transfer_requiresAssociationThenKyc() public {
        assertEq(hts.transferToken(token, address(this), alice, 1), Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT);
        _associate(token, alice);
        assertEq(hts.transferToken(token, address(this), alice, 1), Codes.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN);
        hts.grantTokenKyc(token, alice);
        assertEq(hts.transferToken(token, address(this), alice, 1), Codes.SUCCESS);
        assertEq(_balance(token, alice), 1);
    }

    function test_transfer_rejectsFrozenSenderAndRecipient() public {
        _onboard(alice);
        _onboard(bob);
        hts.transferToken(token, address(this), alice, 10);
        hts.freezeToken(token, alice);

        assertEq(hts.transferToken(token, address(this), alice, 1), Codes.ACCOUNT_FROZEN_FOR_TOKEN);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(MockHtsToken.HederaTransferFailed.selector, Codes.ACCOUNT_FROZEN_FOR_TOKEN)
        );
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        MockHtsToken(token).transfer(bob, 1);
    }

    function test_transfer_onlyBySender() public {
        assertEq(hts.transferToken(token, alice, address(this), 1), Codes.INVALID_SIGNATURE);
    }

    function test_wipe_burnsFromAccount() public {
        _onboard(alice);
        hts.transferToken(token, address(this), alice, 100);

        assertEq(hts.wipeTokenAccount(token, alice, 40), Codes.SUCCESS);
        assertEq(_balance(token, alice), 60);
        assertEq(MockHtsToken(token).totalSupply(), 960);
    }

    function test_wipe_rejectsFrozenAccount() public {
        _onboard(alice);
        hts.transferToken(token, address(this), alice, 100);
        hts.freezeToken(token, alice);
        assertEq(hts.wipeTokenAccount(token, alice, 1), Codes.ACCOUNT_FROZEN_FOR_TOKEN);
    }

    function test_wipe_rejectsAccountWithoutKyc() public {
        _onboard(alice);
        hts.transferToken(token, address(this), alice, 100);
        hts.revokeTokenKyc(token, alice);
        assertEq(hts.wipeTokenAccount(token, alice, 1), Codes.ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN);
    }

    function test_wipe_rejectsTreasuryAndExcess() public {
        _onboard(alice);
        hts.transferToken(token, address(this), alice, 5);
        assertEq(hts.wipeTokenAccount(token, address(this), 1), Codes.CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT);
        assertEq(hts.wipeTokenAccount(token, alice, 6), Codes.INVALID_WIPING_AMOUNT);
    }

    function test_pause_blocksKycFreezeMintAndTransfers() public {
        _associate(token, alice);
        assertEq(hts.pauseToken(token), Codes.SUCCESS);

        assertEq(hts.grantTokenKyc(token, alice), Codes.TOKEN_IS_PAUSED);
        assertEq(hts.freezeToken(token, alice), Codes.TOKEN_IS_PAUSED);
        (int64 code,,) = hts.mintToken(token, 1, new bytes[](0));
        assertEq(code, Codes.TOKEN_IS_PAUSED);

        assertEq(hts.unpauseToken(token), Codes.SUCCESS);
        assertEq(hts.grantTokenKyc(token, alice), Codes.SUCCESS);
    }

    function test_keys_onlyHolderCanUseThem() public {
        _associate(token, alice);
        vm.startPrank(bob);
        assertEq(hts.grantTokenKyc(token, alice), Codes.INVALID_SIGNATURE);
        assertEq(hts.pauseToken(token), Codes.INVALID_SIGNATURE);
        (int64 code,,) = hts.mintToken(token, 1, new bytes[](0));
        assertEq(code, Codes.INVALID_SIGNATURE);
    }

    function _onboard(address account) internal {
        _associate(token, account);
        hts.grantTokenKyc(token, account);
    }
}
