// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Hedera response codes
/// @notice The Hedera response codes that Atollway's contracts and tests rely on.
/// @dev Full list: https://github.com/hiero-ledger/hiero-contracts/blob/main/contracts/common/HederaResponseCodes.sol
library HederaResponseCodes {
    int64 internal constant INVALID_SIGNATURE = 7;
    int64 internal constant INSUFFICIENT_TX_FEE = 9;
    int64 internal constant SUCCESS = 22;
    int64 internal constant ACCOUNT_FROZEN_FOR_TOKEN = 165;
    int64 internal constant ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN = 176;
    int64 internal constant INSUFFICIENT_TOKEN_BALANCE = 178;
    int64 internal constant TOKEN_NOT_ASSOCIATED_TO_ACCOUNT = 184;
    int64 internal constant CANNOT_WIPE_TOKEN_TREASURY_ACCOUNT = 185;
    int64 internal constant INVALID_WIPING_AMOUNT = 192;
    int64 internal constant TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT = 194;
    int64 internal constant TOKEN_IS_PAUSED = 265;
}
