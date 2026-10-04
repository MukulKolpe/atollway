// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IMessageReceiver, ITransport } from "../messaging/ITransport.sol";
import { Client } from "./ccip/Client.sol";
import { IAny2EVMMessageReceiver, IRouterClient } from "./ccip/IRouterClient.sol";

/// @title Chainlink CCIP transport
/// @notice Carries Atollway messages over Chainlink CCIP. One adapter is deployed next to the hub and one next to
/// each spoke gateway. Fees come from the CCIP router's on-chain quote and are paid in the native token.
/// @dev Every CCIP payload is `abi.encode(uint64 originId, uint64 destinationId, bytes message)`, so a message can
/// pass through a {CcipRelay} on a chain with lanes to both ends. A route's peer is either the adapter at the
/// other end or that relay; incoming messages must come from the peer registered for their origin.
/// See docs/adr/0009-ccip-relay.md.
contract CcipTransport is ITransport, IAny2EVMMessageReceiver, IERC165, Ownable2Step {
    struct Route {
        uint64 chainSelector; // CCIP selector of the chain the peer is on
        address peer; // The CcipTransport at the other end, or the relay that reaches it
        uint32 gasLimit; // Gas for ccipReceive on the peer's chain
    }

    IRouterClient public immutable router;

    /// @notice The hub or spoke gateway that this adapter serves.
    IMessageReceiver public immutable receiver;

    /// @notice This endpoint's ID: its chain ID, for example 296 for Hedera testnet.
    uint64 public immutable localId;

    /// @notice Routes by endpoint ID.
    mapping(uint64 endpointId => Route) public routes;

    event RouteSet(uint64 indexed endpointId, uint64 chainSelector, address peer, uint32 gasLimit);
    event MessageSent(bytes32 indexed messageId, uint64 indexed destinationId, uint256 fee);
    event MessageReceived(bytes32 indexed messageId, uint64 indexed originId);

    error NotReceiver(address caller);
    error NotRouter(address caller);
    error UnknownEndpoint(uint64 endpointId);
    error WrongDestination(uint64 destinationId);
    error UnknownSender(uint64 originId, uint64 sourceChainSelector, bytes sender);
    error InsufficientFee(uint256 required, uint256 provided);

    constructor(IRouterClient router_, IMessageReceiver receiver_, uint64 localId_, address owner_) Ownable(owner_) {
        router = router_;
        receiver = receiver_;
        localId = localId_;
    }

    /// @notice Registers or updates how to reach `endpointId`: directly, with the peer's adapter as `peer`, or
    /// through a relay, with the relay's chain and address.
    function setRoute(uint64 endpointId, uint64 chainSelector, address peer, uint32 gasLimit) external onlyOwner {
        routes[endpointId] = Route({ chainSelector: chainSelector, peer: peer, gasLimit: gasLimit });
        emit RouteSet(endpointId, chainSelector, peer, gasLimit);
    }

    /// @inheritdoc ITransport
    /// @dev Through a relay, this is the first hop's fee; the relay pays the second hop.
    function quote(uint64 destinationId, bytes calldata message) external view returns (uint256) {
        Route storage route = _route(destinationId);
        return router.getFee(route.chainSelector, _ccipMessage(route, destinationId, message));
    }

    /// @inheritdoc ITransport
    /// @dev Any `msg.value` above the router's fee is returned to `tx.origin`, the account that paid for the call.
    function send(uint64 destinationId, bytes calldata message) external payable {
        if (msg.sender != address(receiver)) revert NotReceiver(msg.sender);
        Route storage route = _route(destinationId);
        Client.EVM2AnyMessage memory ccipMessage = _ccipMessage(route, destinationId, message);
        uint256 fee = router.getFee(route.chainSelector, ccipMessage);
        if (msg.value < fee) revert InsufficientFee(fee, msg.value);

        bytes32 messageId = router.ccipSend{ value: fee }(route.chainSelector, ccipMessage);
        emit MessageSent(messageId, destinationId, fee);
        if (msg.value > fee) Address.sendValue(payable(tx.origin), msg.value - fee);
    }

    /// @notice Called by the CCIP router with a message for this endpoint. If it reverts, CCIP keeps the message so
    /// it can be executed again later.
    function ccipReceive(Client.Any2EVMMessage calldata message) external {
        if (msg.sender != address(router)) revert NotRouter(msg.sender);
        (uint64 originId, uint64 destinationId, bytes memory payload) =
            abi.decode(message.data, (uint64, uint64, bytes));
        if (destinationId != localId) revert WrongDestination(destinationId);

        Route storage route = routes[originId];
        if (
            route.peer == address(0) || route.chainSelector != message.sourceChainSelector
                || abi.decode(message.sender, (address)) != route.peer
        ) revert UnknownSender(originId, message.sourceChainSelector, message.sender);

        emit MessageReceived(message.messageId, originId);
        receiver.receiveMessage(originId, payload);
    }

    /// @notice Tells the CCIP router that this contract receives messages.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function _route(uint64 endpointId) internal view returns (Route storage route) {
        route = routes[endpointId];
        if (route.peer == address(0)) revert UnknownEndpoint(endpointId);
    }

    function _ccipMessage(Route storage route, uint64 destinationId, bytes calldata message)
        internal
        view
        returns (Client.EVM2AnyMessage memory)
    {
        return Client.EVM2AnyMessage({
            receiver: abi.encode(route.peer),
            data: abi.encode(localId, destinationId, message),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(0),
            extraArgs: Client.argsToBytes(
                Client.GenericExtraArgsV2({ gasLimit: route.gasLimit, allowOutOfOrderExecution: true })
            )
        });
    }
}
