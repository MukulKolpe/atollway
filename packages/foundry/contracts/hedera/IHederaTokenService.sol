// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Hedera Token Service system contract
/// @notice The part of the Hedera Token Service (HTS) system contract at `0x167` that Atollway uses.
/// Each function returns a Hedera response code instead of reverting. `22` means success; the other codes
/// Atollway handles are listed in {HederaResponseCodes}.
/// @dev Struct layouts and function signatures match Hedera's full interface, so calls are ABI-compatible.
/// Reference: https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-smart-contracts
interface IHederaTokenService {
    /// @notice When a token expires and which account pays to renew it.
    struct Expiry {
        int64 second;
        address autoRenewAccount;
        int64 autoRenewPeriod;
    }

    /// @notice A key. Atollway sets only `contractId`, so the key is "this contract".
    struct KeyValue {
        bool inheritAccountKey;
        address contractId;
        bytes ed25519;
        bytes ECDSA_secp256k1;
        address delegatableContractId;
    }

    /// @notice A key and the roles it holds. `keyType` is a bit mask, for example `2 | 4` for KYC and freeze.
    struct TokenKey {
        uint256 keyType;
        KeyValue key;
    }

    /// @notice The properties of a new token.
    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;
        int64 maxSupply;
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    /// @notice Creates a fungible token. `msg.value` pays the creation fee, and any excess is refunded.
    function createFungibleToken(HederaToken memory token, int64 initialTotalSupply, int32 decimals)
        external
        payable
        returns (int64 responseCode, address tokenAddress);

    /// @notice Mints `amount` to the token's treasury. The caller must hold the supply key.
    function mintToken(address token, int64 amount, bytes[] memory metadata)
        external
        returns (int64 responseCode, int64 newTotalSupply, int64[] memory serialNumbers);

    /// @notice Burns `amount` from `account`, which must not be the treasury. The caller must hold the wipe key.
    function wipeTokenAccount(address token, address account, int64 amount) external returns (int64 responseCode);

    /// @notice Moves `amount` from `sender` to `recipient`. The caller must be `sender`.
    function transferToken(address token, address sender, address recipient, int64 amount)
        external
        returns (int64 responseCode);

    /// @notice Lets `account` hold and move the token. The caller must hold the KYC key.
    function grantTokenKyc(address token, address account) external returns (int64 responseCode);

    /// @notice Stops `account` from holding or moving the token. The caller must hold the KYC key.
    function revokeTokenKyc(address token, address account) external returns (int64 responseCode);

    /// @notice Freezes the token in `account`. The caller must hold the freeze key.
    function freezeToken(address token, address account) external returns (int64 responseCode);

    /// @notice Unfreezes the token in `account`. The caller must hold the freeze key.
    function unfreezeToken(address token, address account) external returns (int64 responseCode);

    /// @notice Stops every operation on the token until it is unpaused. The caller must hold the pause key.
    function pauseToken(address token) external returns (int64 responseCode);

    /// @notice Resumes a paused token. The caller must hold the pause key.
    function unpauseToken(address token) external returns (int64 responseCode);
}
