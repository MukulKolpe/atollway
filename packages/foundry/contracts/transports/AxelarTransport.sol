// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { IMessageReceiver, ITransport } from "../messaging/ITransport.sol";
import { IAxelarGasService } from "./axelar/IAxelarGasService.sol";
import { IAxelarGateway } from "./axelar/IAxelarGateway.sol";

/// @title Axelar transport
/// @notice Carries Atollway messages over Axelar General Message Passing. One adapter is deployed next to the
/// hub and one next to each spoke gateway; each knows its peers by endpoint ID. Outgoing messages prepay
/// Axelar's execution gas with a fee the owner sets per route. Incoming messages are accepted only when the
/// Axelar gateway approved them and they come from the registered peer adapter on the registered chain.
/// @dev Axelar's on-chain gas estimates are not populated on testnet, so fees are set by the owner from
/// Axelar's fee API, with headroom; Axelar refunds what is not used. See docs/adr/0008-axelar-fees.md.
contract AxelarTransport is ITransport, Ownable2Step {
    struct Route {
        string axelarChain; // Axelar's name for the peer's chain, for example "base-sepolia".
        address peer; // The AxelarTransport on that chain.
        uint256 fee; // Gas prepaid per message, in this chain's native unit (tinybars on Hedera).
    }

    IAxelarGateway public immutable gateway;
    IAxelarGasService public immutable gasService;

    /// @notice The hub or spoke gateway that this adapter serves.
    IMessageReceiver public immutable receiver;

    /// @notice Peers by endpoint ID.
    mapping(uint64 endpointId => Route) public routes;

    /// @notice Endpoint IDs by the keccak256 hash of their Axelar chain name, for incoming messages.
    mapping(bytes32 axelarChainHash => uint64 endpointId) public endpointOf;

    event RouteSet(uint64 indexed endpointId, string axelarChain, address peer, uint256 fee);

    error NotReceiver(address caller);
    error UnknownEndpoint(uint64 endpointId);
    error UnknownSourceChain(string sourceChain);
    error UnknownSourceAddress(string sourceAddress);
    error NotApprovedByGateway();
    error InsufficientFee(uint256 required, uint256 provided);

    constructor(IAxelarGateway gateway_, IAxelarGasService gasService_, IMessageReceiver receiver_, address owner_)
        Ownable(owner_)
    {
        gateway = gateway_;
        gasService = gasService_;
        receiver = receiver_;
    }

    /// @notice Registers or updates the peer adapter for `endpointId` and the fee prepaid per message to it.
    function setRoute(uint64 endpointId, string calldata axelarChain, address peer, uint256 fee) external onlyOwner {
        Route storage existing = routes[endpointId];
        if (bytes(existing.axelarChain).length != 0) delete endpointOf[keccak256(bytes(existing.axelarChain))];
        routes[endpointId] = Route({ axelarChain: axelarChain, peer: peer, fee: fee });
        endpointOf[keccak256(bytes(axelarChain))] = endpointId;
        emit RouteSet(endpointId, axelarChain, peer, fee);
    }

    /// @inheritdoc ITransport
    function quote(uint64 destinationId, bytes calldata) external view returns (uint256) {
        return _route(destinationId).fee;
    }

    /// @inheritdoc ITransport
    /// @dev Unused gas is refunded by Axelar to `tx.origin`, the account that paid for the call.
    function send(uint64 destinationId, bytes calldata message) external payable {
        if (msg.sender != address(receiver)) revert NotReceiver(msg.sender);
        Route storage route = _route(destinationId);
        if (msg.value < route.fee) revert InsufficientFee(route.fee, msg.value);

        string memory destination = Strings.toHexString(route.peer);
        if (msg.value > 0) {
            gasService.payNativeGasForContractCall{ value: msg.value }(
                address(this), route.axelarChain, destination, message, tx.origin
            );
        }
        gateway.callContract(route.axelarChain, destination, message);
    }

    /// @notice Called by Axelar's relayer with an approved message. Anyone can call it: the gateway check
    /// makes sure the message is genuine and is executed once.
    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, keccak256(payload))) {
            revert NotApprovedByGateway();
        }
        uint64 sourceId = endpointOf[keccak256(bytes(sourceChain))];
        if (sourceId == 0) revert UnknownSourceChain(sourceChain);
        (bool parsed, address sender) = Strings.tryParseAddress(sourceAddress);
        if (!parsed || sender != routes[sourceId].peer) revert UnknownSourceAddress(sourceAddress);

        receiver.receiveMessage(sourceId, payload);
    }

    function _route(uint64 endpointId) internal view returns (Route storage route) {
        route = routes[endpointId];
        if (bytes(route.axelarChain).length == 0) revert UnknownEndpoint(endpointId);
    }
}
