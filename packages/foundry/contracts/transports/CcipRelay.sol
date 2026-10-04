// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { Client } from "./ccip/Client.sol";
import { IAny2EVMMessageReceiver, IRouterClient } from "./ccip/IRouterClient.sol";

/// @title CCIP relay
/// @notice Forwards Atollway messages between endpoints with no direct CCIP lane between them, from a chain with
/// lanes to both, such as Base. It accepts a message only from the registered peer of its origin endpoint, and
/// sends it on unchanged to the registered peer of its destination. The relay pays the second hop's fee from its
/// own balance, which the issuer keeps funded.
/// @dev Payloads use the {CcipTransport} envelope: `abi.encode(uint64 originId, uint64 destinationId, bytes message)`.
/// See docs/adr/0009-ccip-relay.md.
contract CcipRelay is IAny2EVMMessageReceiver, IERC165, Ownable2Step {
    struct Route {
        uint64 chainSelector; // CCIP selector of the endpoint's chain
        address peer; // The endpoint's CcipTransport
        uint32 gasLimit; // Gas for ccipReceive on the endpoint's chain
    }

    IRouterClient public immutable router;

    /// @notice Endpoints by ID.
    mapping(uint64 endpointId => Route) public routes;

    event RouteSet(uint64 indexed endpointId, uint64 chainSelector, address peer, uint32 gasLimit);
    event Relayed(
        bytes32 indexed inboundMessageId,
        bytes32 indexed outboundMessageId,
        uint64 originId,
        uint64 destinationId,
        uint256 fee
    );

    error NotRouter(address caller);
    error UnknownEndpoint(uint64 endpointId);
    error UnknownSender(uint64 originId, uint64 sourceChainSelector, bytes sender);
    error InsufficientBalance(uint256 required, uint256 balance);

    constructor(IRouterClient router_, address owner_) Ownable(owner_) {
        router = router_;
    }

    /// @notice Accepts HBAR or ETH that pays for forwarded messages.
    receive() external payable { }

    /// @notice Registers or updates an endpoint the relay forwards to and accepts from.
    function setRoute(uint64 endpointId, uint64 chainSelector, address peer, uint32 gasLimit) external onlyOwner {
        routes[endpointId] = Route({ chainSelector: chainSelector, peer: peer, gasLimit: gasLimit });
        emit RouteSet(endpointId, chainSelector, peer, gasLimit);
    }

    /// @notice Withdraws funds the relay no longer needs.
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        Address.sendValue(to, amount);
    }

    /// @notice The fee the relay pays to forward a payload to `destinationId`.
    function quoteForward(uint64 destinationId, bytes calldata payload) external view returns (uint256) {
        Route storage destination = _route(destinationId);
        return router.getFee(destination.chainSelector, _ccipMessage(destination, payload));
    }

    /// @notice Called by the CCIP router. Checks the sender and forwards the payload. If the relay's balance is too
    /// low, the call reverts and CCIP keeps the message so it can be executed again once the relay is funded.
    function ccipReceive(Client.Any2EVMMessage calldata message) external {
        if (msg.sender != address(router)) revert NotRouter(msg.sender);
        (uint64 originId, uint64 destinationId,) = abi.decode(message.data, (uint64, uint64, bytes));

        Route storage origin = routes[originId];
        if (
            origin.peer == address(0) || origin.chainSelector != message.sourceChainSelector
                || abi.decode(message.sender, (address)) != origin.peer
        ) revert UnknownSender(originId, message.sourceChainSelector, message.sender);

        Route storage destination = _route(destinationId);
        Client.EVM2AnyMessage memory outbound = _ccipMessage(destination, message.data);
        uint256 fee = router.getFee(destination.chainSelector, outbound);
        if (address(this).balance < fee) revert InsufficientBalance(fee, address(this).balance);

        bytes32 outboundMessageId = router.ccipSend{ value: fee }(destination.chainSelector, outbound);
        emit Relayed(message.messageId, outboundMessageId, originId, destinationId, fee);
    }

    /// @notice Tells the CCIP router that this contract receives messages.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IAny2EVMMessageReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function _route(uint64 endpointId) internal view returns (Route storage route) {
        route = routes[endpointId];
        if (route.peer == address(0)) revert UnknownEndpoint(endpointId);
    }

    function _ccipMessage(Route storage destination, bytes memory payload)
        internal
        view
        returns (Client.EVM2AnyMessage memory)
    {
        return Client.EVM2AnyMessage({
            receiver: abi.encode(destination.peer),
            data: payload,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(0),
            extraArgs: Client.argsToBytes(
                Client.GenericExtraArgsV2({ gasLimit: destination.gasLimit, allowOutOfOrderExecution: true })
            )
        });
    }
}
