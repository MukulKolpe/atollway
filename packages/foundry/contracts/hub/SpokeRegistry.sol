// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ITransport } from "../messaging/ITransport.sol";
import { AssetToken } from "./AssetToken.sol";

/// @title Spoke registry
/// @notice Records each spoke's transport adapter, supply cap and outstanding amount, and sends messages to
/// spokes through their adapters.
/// @dev See docs/adr/0003-axelar-and-ccip-transports.md and docs/adr/0005-spoke-supply-caps.md.
abstract contract SpokeRegistry is AssetToken {
    struct Spoke {
        ITransport transport; // Carries messages to and from the spoke. Zero disconnects the spoke.
        uint256 cap; // The most the spoke may hold, in the asset's smallest unit.
        uint256 outstanding; // How much of the asset the spoke holds now.
        bool registered;
    }

    /// @notice Spokes by ID. By convention a spoke's ID is its chain ID.
    mapping(uint64 spokeId => Spoke) public spokes;

    uint64[] internal _spokeIds;

    event SpokeAdded(uint64 indexed spokeId, ITransport transport, uint256 cap);
    event SpokeTransportUpdated(uint64 indexed spokeId, ITransport transport);
    event SpokeCapUpdated(uint64 indexed spokeId, uint256 cap);

    error SpokeAlreadyAdded(uint64 spokeId);
    error UnknownSpoke(uint64 spokeId);
    error SpokeDisconnected(uint64 spokeId);
    error InsufficientFee(uint256 required, uint256 provided);

    /// @notice Registers a spoke reached through `transport`, holding at most `cap`.
    function addSpoke(uint64 spokeId, ITransport transport, uint256 cap) external onlyOwner {
        if (spokes[spokeId].registered) revert SpokeAlreadyAdded(spokeId);
        spokes[spokeId] = Spoke({ transport: transport, cap: cap, outstanding: 0, registered: true });
        _spokeIds.push(spokeId);
        emit SpokeAdded(spokeId, transport, cap);
    }

    /// @notice Moves a spoke to another adapter, or disconnects it with the zero address. A disconnected spoke
    /// can neither send nor receive messages until it is connected again.
    function setSpokeTransport(uint64 spokeId, ITransport transport) external onlyOwner {
        _registeredSpoke(spokeId).transport = transport;
        emit SpokeTransportUpdated(spokeId, transport);
    }

    /// @notice Changes a spoke's cap. A cap below the outstanding amount only blocks new transfers to the spoke.
    function setSpokeCap(uint64 spokeId, uint256 cap) external onlyOwner {
        _registeredSpoke(spokeId).cap = cap;
        emit SpokeCapUpdated(spokeId, cap);
    }

    /// @notice The IDs of every registered spoke.
    function spokeIds() external view returns (uint64[] memory) {
        return _spokeIds;
    }

    function _registeredSpoke(uint64 spokeId) internal view returns (Spoke storage spoke) {
        spoke = spokes[spokeId];
        if (!spoke.registered) revert UnknownSpoke(spokeId);
    }

    function _connectedSpoke(uint64 spokeId) internal view returns (Spoke storage spoke) {
        spoke = _registeredSpoke(spokeId);
        if (address(spoke.transport) == address(0)) revert SpokeDisconnected(spokeId);
    }

    /// @dev Sends `message` to one spoke, paying its fee from `msg.value`. `spent` is what the current call has
    /// already paid in fees; returns the new total.
    function _send(uint64 spokeId, bytes memory message, uint256 spent) internal returns (uint256) {
        ITransport transport = _connectedSpoke(spokeId).transport;
        uint256 fee = transport.quote(spokeId, message);
        spent += fee;
        if (spent > msg.value) revert InsufficientFee(spent, msg.value);
        transport.send{ value: fee }(spokeId, message);
        return spent;
    }

    /// @dev Sends `message` to every connected spoke, paying the fees from `msg.value`. Returns the total paid.
    function _broadcast(bytes memory message) internal returns (uint256 spent) {
        spent = _quoteBroadcast(message);
        if (spent > msg.value) revert InsufficientFee(spent, msg.value);
        for (uint256 i; i < _spokeIds.length; i++) {
            uint64 spokeId = _spokeIds[i];
            ITransport transport = spokes[spokeId].transport;
            if (address(transport) == address(0)) continue;
            transport.send{ value: transport.quote(spokeId, message) }(spokeId, message);
        }
    }

    /// @dev The total fee to send `message` to every connected spoke.
    function _quoteBroadcast(bytes memory message) internal view returns (uint256 total) {
        for (uint256 i; i < _spokeIds.length; i++) {
            uint64 spokeId = _spokeIds[i];
            ITransport transport = spokes[spokeId].transport;
            if (address(transport) != address(0)) total += transport.quote(spokeId, message);
        }
    }

    /// @dev Returns the part of `msg.value` that was not `spent` on fees to the caller.
    function _refundUnspent(uint256 spent) internal {
        if (msg.value > spent) Address.sendValue(payable(msg.sender), msg.value - spent);
    }
}
