// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IMessageReceiver, ITransport } from "../../contracts/messaging/ITransport.sol";

/// @notice Test double for a transport adapter. It charges a fixed fee, records every message sent, and
/// delivers messages to a receiver on request.
contract MockTransport is ITransport {
    struct Sent {
        uint64 destinationId;
        bytes message;
        uint256 fee;
    }

    uint256 public fee;
    Sent[] internal _sent;

    error WrongFee(uint256 expected, uint256 provided);

    constructor(uint256 fee_) {
        fee = fee_;
    }

    function quote(uint64, bytes calldata) external view returns (uint256) {
        return fee;
    }

    function send(uint64 destinationId, bytes calldata message) external payable {
        if (msg.value != fee) revert WrongFee(fee, msg.value);
        _sent.push(Sent({ destinationId: destinationId, message: message, fee: msg.value }));
    }

    /// @notice Delivers `message` to `receiver` as if it arrived from `sourceId`.
    function deliver(IMessageReceiver receiver, uint64 sourceId, bytes calldata message) external {
        receiver.receiveMessage(sourceId, message);
    }

    function sentCount() external view returns (uint256) {
        return _sent.length;
    }

    function sent(uint256 index) external view returns (Sent memory) {
        return _sent[index];
    }

    function lastSent() external view returns (Sent memory) {
        return _sent[_sent.length - 1];
    }
}
