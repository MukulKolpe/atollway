// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IHederaTokenService } from "../../contracts/hedera/IHederaTokenService.sol";
import { HederaResponseCodes as Codes } from "../../contracts/hedera/HederaResponseCodes.sol";
import { HederaTokens } from "../../contracts/hedera/HederaTokens.sol";
import { HederaTest } from "../utils/HederaTest.sol";

/// @notice Calls each {HederaTokens} function, holding every key of the token it creates.
contract HederaTokensCaller {
    address public token;

    function create() external payable {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: HederaTokens.KYC_KEY | HederaTokens.FREEZE_KEY | HederaTokens.WIPE_KEY | HederaTokens.SUPPLY_KEY
                | HederaTokens.PAUSE_KEY,
            key: IHederaTokenService.KeyValue(false, address(this), "", "", address(0))
        });
        token = HederaTokens.createFungibleToken(
            IHederaTokenService.HederaToken({
                name: "Test",
                symbol: "TST",
                treasury: address(this),
                memo: "",
                tokenSupplyType: false,
                maxSupply: 0,
                freezeDefault: false,
                tokenKeys: keys,
                expiry: IHederaTokenService.Expiry(0, address(this), 7_776_000)
            }),
            6,
            msg.value
        );
    }

    function mint(uint256 amount) external {
        HederaTokens.mint(token, amount);
    }

    function wipe(address account, uint256 amount) external {
        HederaTokens.wipe(token, account, amount);
    }

    function transfer(address recipient, uint256 amount) external {
        HederaTokens.transfer(token, recipient, amount);
    }

    function grantKyc(address account) external {
        HederaTokens.grantKyc(token, account);
    }

    function revokeKyc(address account) external {
        HederaTokens.revokeKyc(token, account);
    }

    function freeze(address account) external {
        HederaTokens.freeze(token, account);
    }

    function unfreeze(address account) external {
        HederaTokens.unfreeze(token, account);
    }

    function pause() external {
        HederaTokens.pause(token);
    }

    function unpause() external {
        HederaTokens.unpause(token);
    }
}

contract HederaTokensTest is HederaTest {
    HederaTokensCaller internal caller;
    address internal token;
    address internal alice = makeAddr("alice");

    function setUp() public override {
        super.setUp();
        caller = new HederaTokensCaller();
        caller.create{ value: CREATION_VALUE }();
        token = caller.token();
    }

    function test_create_givesEveryKeyToTheCaller() public view {
        assertTrue(hts.isToken(token));
        assertEq(hts.treasuryOf(token), address(caller));
        for (uint256 key = 2; key <= 64; key <<= 1) {
            if (key == 32) continue; // no fee schedule key
            assertEq(hts.keyHolder(token, key), address(caller));
        }
    }

    function test_mintTransferAndWipe() public {
        _associate(token, alice);
        caller.grantKyc(alice);
        caller.mint(100);
        caller.transfer(alice, 60);
        caller.wipe(alice, 10);

        assertEq(_balance(token, alice), 50);
        assertEq(_balance(token, address(caller)), 40);
        assertEq(hts.totalSupply(token), 90);
    }

    function test_kycAndFreeze() public {
        _associate(token, alice);
        caller.grantKyc(alice);
        caller.freeze(alice);
        assertTrue(hts.isFrozen(token, alice));
        caller.unfreeze(alice);
        caller.revokeKyc(alice);
        assertFalse(hts.isKyc(token, alice));
    }

    function test_failure_revertsWithSelectorAndCode() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector,
                IHederaTokenService.grantTokenKyc.selector,
                Codes.TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
            )
        );
        caller.grantKyc(alice);
    }

    function test_pause_blocksMint() public {
        caller.pause();
        vm.expectRevert(
            abi.encodeWithSelector(
                HederaTokens.HederaCallFailed.selector, IHederaTokenService.mintToken.selector, Codes.TOKEN_IS_PAUSED
            )
        );
        caller.mint(1);
        caller.unpause();
        caller.mint(1);
    }

    function test_amountAboveInt64_reverts() public {
        vm.expectRevert();
        caller.mint(uint256(uint64(type(int64).max)) + 1);
    }
}
