// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Transport adapter
/// @notice Carries messages between the hub and spokes over one bridge, such as Axelar or Chainlink CCIP.
/// The hub and each spoke gateway call {send}; the adapter delivers incoming messages to them through
/// {IMessageReceiver}, after checking where each message came from.
/// @dev Endpoints are identified by a `uint64` ID: a spoke's ID on the hub, the hub's ID on a spoke.
/// By convention the ID is the endpoint's chain ID. See docs/adr/0003-axelar-and-ccip-transports.md.
interface ITransport {
    /// @notice The bridge fee, in the native token, to send `message` to `destinationId`.
    function quote(uint64 destinationId, bytes calldata message) external view returns (uint256 fee);

    /// @notice Sends `message` to `destinationId`. `msg.value` pays the bridge fee from {quote}.
    function send(uint64 destinationId, bytes calldata message) external payable;
}

/// @title Message receiver
/// @notice Implemented by the hub and by spoke gateways to receive messages from their transport adapter.
interface IMessageReceiver {
    /// @notice Handles a verified `message` from `sourceId`. Only the adapter registered for `sourceId` may call it.
    function receiveMessage(uint64 sourceId, bytes calldata message) external;
}
