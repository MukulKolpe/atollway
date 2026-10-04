// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { HederaTokens } from "../hedera/HederaTokens.sol";
import { IMessageReceiver } from "../messaging/ITransport.sol";
import { Messages } from "../messaging/Messages.sol";
import { InvestorRegister } from "./InvestorRegister.sol";
import { SpokeRegistry } from "./SpokeRegistry.sol";

/// @title Supply ledger
/// @notice Moves shares between Hedera and the spokes. Shares sent to a spoke are burned on Hedera and minted
/// there; shares sent back are burned on the spoke and released on Hedera. Each spoke's outstanding amount
/// stays within its cap, and each transfer ID is accepted once.
/// @dev Total supply = supply on Hedera + outstanding amounts of all spokes. See docs/adr/0005-spoke-supply-caps.md.
abstract contract SupplyLedger is InvestorRegister, SpokeRegistry, IMessageReceiver {
    /// @notice How many transfers to spokes this hub has started. Used to derive transfer IDs.
    uint256 public transferCount;

    /// @notice Transfer IDs of the shares already released on Hedera.
    mapping(bytes32 transferId => bool) public released;

    event SentToSpoke(bytes32 indexed transferId, uint64 indexed spokeId, address indexed investor, uint256 amount);
    event ReleasedFromSpoke(
        bytes32 indexed transferId, uint64 indexed spokeId, address indexed investor, uint256 amount
    );

    error ZeroAmount();
    error CapExceeded(uint64 spokeId, uint256 outstanding, uint256 amount, uint256 cap);
    error NotSpokeTransport(uint64 spokeId, address caller);
    error UnexpectedMessage(uint8 kind);
    error AlreadyReleased(bytes32 transferId);
    error ExceedsOutstanding(uint64 spokeId, uint256 amount, uint256 outstanding);

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

    /// @notice Releases shares returned from a spoke. Only the spoke's transport adapter can call it.
    /// @dev If the transfer cannot complete, for example because the recipient was frozen meanwhile, the call
    /// reverts and the bridge keeps the message so it can be executed again later.
    function receiveMessage(uint64 sourceId, bytes calldata message) external nonReentrant {
        Spoke storage spoke = spokes[sourceId];
        if (address(spoke.transport) == address(0) || msg.sender != address(spoke.transport)) {
            revert NotSpokeTransport(sourceId, msg.sender);
        }

        (uint8 kind, bytes memory payload) = Messages.decode(message);
        if (kind != Messages.RELEASE) revert UnexpectedMessage(kind);
        (bytes32 transferId, address recipient, uint256 amount) = Messages.decodeTransfer(payload);
        if (released[transferId]) revert AlreadyReleased(transferId);
        if (amount > spoke.outstanding) revert ExceedsOutstanding(sourceId, amount, spoke.outstanding);

        released[transferId] = true;
        spoke.outstanding -= amount;

        address token = _requireAsset();
        HederaTokens.mint(token, amount);
        HederaTokens.transfer(token, recipient, amount);
        emit ReleasedFromSpoke(transferId, sourceId, recipient, amount);
    }
}
