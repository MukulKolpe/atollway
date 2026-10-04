// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { HederaTokens } from "../hedera/HederaTokens.sol";
import { Messages } from "../messaging/Messages.sol";
import { InvestorRegister } from "./InvestorRegister.sol";
import { SpokeRegistry } from "./SpokeRegistry.sol";

/// @title Supply ledger
/// @notice Moves shares from Hedera to the spokes. Shares sent to a spoke are burned on Hedera and minted there,
/// and the spoke's outstanding amount stays within its cap.
/// @dev Total supply = supply on Hedera + outstanding amounts of all spokes. See docs/adr/0005-spoke-supply-caps.md.
abstract contract SupplyLedger is InvestorRegister, SpokeRegistry {
    /// @notice How many transfers to spokes this hub has started. Used to derive transfer IDs.
    uint256 public transferCount;

    event SentToSpoke(bytes32 indexed transferId, uint64 indexed spokeId, address indexed investor, uint256 amount);

    error ZeroAmount();
    error CapExceeded(uint64 spokeId, uint256 outstanding, uint256 amount, uint256 cap);

    /// @notice Sends `amount` of the caller's shares to the same address on `spokeId`. The shares are burned here
    /// and minted on the spoke when the bridge delivers the message. Send the bridge fee from {quoteSendToSpoke}.
    function sendToSpoke(uint64 spokeId, uint256 amount) external payable nonReentrant returns (bytes32 transferId) {
        address token = _requireAsset();
        if (!isApproved(msg.sender)) revert NotApproved(msg.sender);
        if (amount == 0) revert ZeroAmount();
        Spoke storage spoke = _connectedSpoke(spokeId);
        if (spoke.outstanding + amount > spoke.cap) revert CapExceeded(spokeId, spoke.outstanding, amount, spoke.cap);

        // The wipe key burns the shares from the caller's own account, so no allowance is needed.
        HederaTokens.wipe(token, msg.sender, amount);
        spoke.outstanding += amount;

        transferId = keccak256(abi.encode(block.chainid, address(this), ++transferCount));
        emit SentToSpoke(transferId, spokeId, msg.sender, amount);
        _refundUnspent(_send(spokeId, Messages.encodeTransfer(Messages.MINT, transferId, msg.sender, amount), 0));
    }

    /// @notice The bridge fee for {sendToSpoke}.
    function quoteSendToSpoke(uint64 spokeId) external view returns (uint256) {
        Spoke storage spoke = _connectedSpoke(spokeId);
        return spoke.transport.quote(spokeId, Messages.encodeTransfer(Messages.MINT, bytes32(0), address(0), 0));
    }
}
