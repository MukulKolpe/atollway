// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice An investor's status, decided by the hub's investor register and applied on every chain.
/// Only `Approved` investors can hold, move, subscribe for or bridge the asset.
enum InvestorStatus {
    None,
    Approved,
    Frozen,
    Revoked
}
