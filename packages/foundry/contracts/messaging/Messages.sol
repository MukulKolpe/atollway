// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../common/InvestorStatus.sol";

/// @title Cross-chain messages
/// @notice Encodes and decodes the messages exchanged by the hub and spokes. Every message is an envelope,
/// `abi.encode(uint8 version, uint8 kind, bytes payload)`, and the payload depends on the kind:
/// - `COMPLIANCE`, hub to spoke: `abi.encode(address account, uint8 status, uint64 sequence)`
/// - `MINT`, hub to spoke: `abi.encode(bytes32 transferId, address recipient, uint256 amount)`
/// - `RELEASE`, spoke to hub: `abi.encode(bytes32 transferId, address recipient, uint256 amount)`
/// - `PAUSE`, hub to spoke: `abi.encode(bool paused)`
library Messages {
    /// @notice The envelope format version this code reads and writes.
    uint8 internal constant VERSION = 1;

    uint8 internal constant COMPLIANCE = 1;
    uint8 internal constant MINT = 2;
    uint8 internal constant RELEASE = 3;
    uint8 internal constant PAUSE = 4;

    error UnsupportedVersion(uint8 version);
    error NotATransferKind(uint8 kind);

    function encodeCompliance(address account, InvestorStatus status, uint64 sequence)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(VERSION, COMPLIANCE, abi.encode(account, status, sequence));
    }

    /// @notice Encodes a `MINT` or `RELEASE` message.
    function encodeTransfer(uint8 kind, bytes32 transferId, address recipient, uint256 amount)
        internal
        pure
        returns (bytes memory)
    {
        if (kind != MINT && kind != RELEASE) revert NotATransferKind(kind);
        return abi.encode(VERSION, kind, abi.encode(transferId, recipient, amount));
    }

    function encodePause(bool paused) internal pure returns (bytes memory) {
        return abi.encode(VERSION, PAUSE, abi.encode(paused));
    }

    /// @notice Opens the envelope. Reverts if it was written by an unsupported version.
    function decode(bytes memory message) internal pure returns (uint8 kind, bytes memory payload) {
        uint8 version;
        (version, kind, payload) = abi.decode(message, (uint8, uint8, bytes));
        if (version != VERSION) revert UnsupportedVersion(version);
    }

    function decodeCompliance(bytes memory payload)
        internal
        pure
        returns (address account, InvestorStatus status, uint64 sequence)
    {
        return abi.decode(payload, (address, InvestorStatus, uint64));
    }

    function decodeTransfer(bytes memory payload)
        internal
        pure
        returns (bytes32 transferId, address recipient, uint256 amount)
    {
        return abi.decode(payload, (bytes32, address, uint256));
    }

    function decodePause(bytes memory payload) internal pure returns (bool paused) {
        return abi.decode(payload, (bool));
    }
}
