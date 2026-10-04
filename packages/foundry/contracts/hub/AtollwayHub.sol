// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../common/InvestorStatus.sol";
import { HederaTokens } from "../hedera/HederaTokens.sol";
import { Messages } from "../messaging/Messages.sol";
import { AggregatorV3Interface } from "../oracles/AggregatorV3Interface.sol";
import { AssetToken } from "./AssetToken.sol";
import { InvestorRegister } from "./InvestorRegister.sol";
import { Subscriptions } from "./Subscriptions.sol";
import { SupplyLedger } from "./SupplyLedger.sol";

/// @title Atollway hub
/// @notice The Hedera side of Atollway. It issues the asset as an HTS token, keeps the investor register, sells
/// shares for HBAR at the issuer's NAV, and moves shares to and from spokes on other chains. Compliance
/// decisions and pauses are sent to every spoke.
/// @dev See docs/architecture.md. The owner is the issuer; in production, use a multisig.
contract AtollwayHub is Subscriptions, SupplyLedger {
    /// @notice Whether the issuer has paused the asset. While paused, Hedera blocks every operation on the token.
    bool public paused;

    event PausedChanged(bool paused);

    error PausedUnchanged(bool paused);

    constructor(address issuer, AggregatorV3Interface hbarUsdFeed, uint256 maxPriceAge)
        AssetToken(issuer)
        Subscriptions(hbarUsdFeed, maxPriceAge)
    { }

    /// @notice Pauses the asset on Hedera and on every spoke. Send the bridge fee from {quotePauseBroadcast}.
    function pause() external payable onlyOwner nonReentrant {
        _setPaused(true);
    }

    /// @notice Resumes the asset on Hedera and on every spoke. Send the bridge fee from {quotePauseBroadcast}.
    function unpause() external payable onlyOwner nonReentrant {
        _setPaused(false);
    }

    /// @notice Sends the current status of each of `accounts` to one spoke, for example after adding it.
    /// Spokes ignore statuses they have already applied. Send the bridge fee for each account.
    function resendCompliance(uint64 spokeId, address[] calldata accounts) external payable onlyOwner nonReentrant {
        uint256 spent;
        for (uint256 i; i < accounts.length; i++) {
            address account = accounts[i];
            spent = _send(spokeId, Messages.encodeCompliance(account, statusOf[account], sequenceOf[account]), spent);
        }
        _refundUnspent(spent);
    }

    /// @notice The bridge fee for one investor status change: approving, freezing, unfreezing or revoking.
    function quoteComplianceBroadcast() external view returns (uint256) {
        return _quoteBroadcast(Messages.encodeCompliance(address(0), InvestorStatus.None, 0));
    }

    /// @notice The bridge fee for {pause} or {unpause}.
    function quotePauseBroadcast() external view returns (uint256) {
        return _quoteBroadcast(Messages.encodePause(true));
    }

    function _setPaused(bool value) internal {
        if (paused == value) revert PausedUnchanged(value);
        address token = _requireAsset();
        if (value) HederaTokens.pause(token);
        else HederaTokens.unpause(token);
        paused = value;
        emit PausedChanged(value);
        _refundUnspent(_broadcast(Messages.encodePause(value)));
    }

    /// @dev Sends every investor status change to every connected spoke.
    function _afterStatusChange(address account, InvestorStatus status, uint64 sequence)
        internal
        override(InvestorRegister)
    {
        _refundUnspent(_broadcast(Messages.encodeCompliance(account, status, sequence)));
    }
}
