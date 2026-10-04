// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { IHederaTokenService } from "./IHederaTokenService.sol";
import { HederaResponseCodes } from "./HederaResponseCodes.sol";

/// @title Hedera token helpers
/// @notice Calls the Hedera Token Service system contract and reverts with {HederaCallFailed} when Hedera
/// returns anything other than success, so callers never have to check response codes.
library HederaTokens {
    /// @notice Address of the Hedera Token Service system contract.
    address internal constant HTS = address(0x167);

    /// @notice Key roles, combined as a bit mask in {IHederaTokenService.TokenKey}.
    uint256 internal constant KYC_KEY = 2;
    uint256 internal constant FREEZE_KEY = 4;
    uint256 internal constant WIPE_KEY = 8;
    uint256 internal constant SUPPLY_KEY = 16;
    uint256 internal constant PAUSE_KEY = 64;

    /// @notice Hedera rejected a call. `selector` names the HTS function and `responseCode` gives the reason.
    error HederaCallFailed(bytes4 selector, int64 responseCode);

    /// @notice Creates a fungible token with no initial supply, paying `fee` towards the creation fee.
    function createFungibleToken(IHederaTokenService.HederaToken memory token, uint8 decimals, uint256 fee)
        internal
        returns (address tokenAddress)
    {
        int64 responseCode;
        (responseCode, tokenAddress) =
            IHederaTokenService(HTS).createFungibleToken{ value: fee }(token, 0, int32(uint32(decimals)));
        _check(IHederaTokenService.createFungibleToken.selector, responseCode);
    }

    /// @notice Mints `amount` to the token's treasury.
    function mint(address token, uint256 amount) internal {
        (int64 responseCode,,) = IHederaTokenService(HTS).mintToken(token, _toInt64(amount), new bytes[](0));
        _check(IHederaTokenService.mintToken.selector, responseCode);
    }

    /// @notice Burns `amount` held by `account`.
    function wipe(address token, address account, uint256 amount) internal {
        int64 responseCode = IHederaTokenService(HTS).wipeTokenAccount(token, account, _toInt64(amount));
        _check(IHederaTokenService.wipeTokenAccount.selector, responseCode);
    }

    /// @notice Moves `amount` from this contract to `recipient`.
    function transfer(address token, address recipient, uint256 amount) internal {
        int64 responseCode = IHederaTokenService(HTS).transferToken(token, address(this), recipient, _toInt64(amount));
        _check(IHederaTokenService.transferToken.selector, responseCode);
    }

    function grantKyc(address token, address account) internal {
        _check(IHederaTokenService.grantTokenKyc.selector, IHederaTokenService(HTS).grantTokenKyc(token, account));
    }

    function revokeKyc(address token, address account) internal {
        _check(IHederaTokenService.revokeTokenKyc.selector, IHederaTokenService(HTS).revokeTokenKyc(token, account));
    }

    function freeze(address token, address account) internal {
        _check(IHederaTokenService.freezeToken.selector, IHederaTokenService(HTS).freezeToken(token, account));
    }

    function unfreeze(address token, address account) internal {
        _check(IHederaTokenService.unfreezeToken.selector, IHederaTokenService(HTS).unfreezeToken(token, account));
    }

    function pause(address token) internal {
        _check(IHederaTokenService.pauseToken.selector, IHederaTokenService(HTS).pauseToken(token));
    }

    function unpause(address token) internal {
        _check(IHederaTokenService.unpauseToken.selector, IHederaTokenService(HTS).unpauseToken(token));
    }

    function _toInt64(uint256 amount) private pure returns (int64) {
        return SafeCast.toInt64(SafeCast.toInt256(amount));
    }

    function _check(bytes4 selector, int64 responseCode) private pure {
        if (responseCode != HederaResponseCodes.SUCCESS) revert HederaCallFailed(selector, responseCode);
    }
}
