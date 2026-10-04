// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../common/InvestorStatus.sol";
import { HederaTokens } from "../hedera/HederaTokens.sol";
import { AssetToken } from "./AssetToken.sol";

/// @title Investor register
/// @notice Approves, freezes and revokes investors, identified by their EVM address. Each decision is applied
/// to the asset token on Hedera and numbered with a per-investor sequence, so spokes can apply decisions in order.
/// @dev Hedera grants KYC only to accounts associated with the token, so an investor associates first.
/// See docs/adr/0004-evm-address-identity.md and docs/adr/0006-association-before-approval.md.
abstract contract InvestorRegister is AssetToken {
    /// @notice Each investor's current status.
    mapping(address account => InvestorStatus) public statusOf;

    /// @notice How many status changes each investor has had. Spokes ignore changes older than the last applied.
    mapping(address account => uint64) public sequenceOf;

    event InvestorStatusChanged(address indexed account, InvestorStatus status, uint64 sequence);

    error InvalidStatusChange(address account, InvestorStatus from, InvestorStatus to);
    error NotApproved(address account);

    /// @notice Approves `account`, which must already be associated with the asset token.
    /// Send the bridge fee for every spoke with the call (see `quoteComplianceBroadcast`).
    function approveInvestor(address account) external payable onlyOwner nonReentrant {
        _requireStatus(account, InvestorStatus.Approved, InvestorStatus.None, InvestorStatus.Revoked);
        HederaTokens.grantKyc(_requireAsset(), account);
        _setStatus(account, InvestorStatus.Approved);
    }

    /// @notice Freezes an approved investor's asset on Hedera and on every spoke.
    function freezeInvestor(address account) external payable onlyOwner nonReentrant {
        _requireStatus(account, InvestorStatus.Frozen, InvestorStatus.Approved, InvestorStatus.Approved);
        HederaTokens.freeze(_requireAsset(), account);
        _setStatus(account, InvestorStatus.Frozen);
    }

    /// @notice Unfreezes a frozen investor, who becomes approved again.
    function unfreezeInvestor(address account) external payable onlyOwner nonReentrant {
        _requireStatus(account, InvestorStatus.Approved, InvestorStatus.Frozen, InvestorStatus.Frozen);
        HederaTokens.unfreeze(_requireAsset(), account);
        _setStatus(account, InvestorStatus.Approved);
    }

    /// @notice Revokes an approved or frozen investor. The account keeps its balance but can no longer move it.
    function revokeInvestor(address account) external payable onlyOwner nonReentrant {
        address token = _requireAsset();
        InvestorStatus current =
            _requireStatus(account, InvestorStatus.Revoked, InvestorStatus.Approved, InvestorStatus.Frozen);
        // Unfreeze first, so the account is not left frozen on Hedera if it is approved again later.
        if (current == InvestorStatus.Frozen) HederaTokens.unfreeze(token, account);
        HederaTokens.revokeKyc(token, account);
        _setStatus(account, InvestorStatus.Revoked);
    }

    /// @notice Whether `account` is approved and not frozen.
    function isApproved(address account) public view returns (bool) {
        return statusOf[account] == InvestorStatus.Approved;
    }

    /// @dev Called after every status change. The hub sends the change to every spoke.
    function _afterStatusChange(address account, InvestorStatus status, uint64 sequence) internal virtual;

    function _setStatus(address account, InvestorStatus status) internal {
        uint64 sequence = ++sequenceOf[account];
        statusOf[account] = status;
        emit InvestorStatusChanged(account, status, sequence);
        _afterStatusChange(account, status, sequence);
    }

    /// @dev Reverts unless the current status is `allowedA` or `allowedB`.
    function _requireStatus(address account, InvestorStatus to, InvestorStatus allowedA, InvestorStatus allowedB)
        internal
        view
        returns (InvestorStatus current)
    {
        current = statusOf[account];
        if (current != allowedA && current != allowedB) revert InvalidStatusChange(account, current, to);
    }
}
