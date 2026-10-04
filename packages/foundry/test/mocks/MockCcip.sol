// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC165Checker } from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import { Client } from "../../contracts/transports/ccip/Client.sol";
import { IAny2EVMMessageReceiver, IRouterClient } from "../../contracts/transports/ccip/IRouterClient.sol";

/// @notice Test double for a CCIP router on one chain. It charges a fixed native fee, records every message sent,
/// and delivers messages handed to it by {MockCcipNetwork}, only to receivers that report the CCIP receiver
/// interface, like the real router.
contract MockCcipRouter is IRouterClient {
    struct Sent {
        address sender;
        uint64 destinationChainSelector;
        bytes receiver;
        bytes data;
        bytes extraArgs;
        uint256 fee;
        bytes32 messageId;
    }

    uint64 public immutable chainSelector;
    uint256 public fee;
    Sent[] internal _sent;

    error InsufficientFee(uint256 required, uint256 provided);
    error NotACcipReceiver(address receiver);

    constructor(uint64 chainSelector_, uint256 fee_) {
        chainSelector = chainSelector_;
        fee = fee_;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory) external view returns (uint256) {
        return fee;
    }

    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage calldata message)
        external
        payable
        returns (bytes32 messageId)
    {
        if (msg.value < fee) revert InsufficientFee(fee, msg.value);
        messageId = keccak256(abi.encode(chainSelector, _sent.length));
        _sent.push(
            Sent({
                sender: msg.sender,
                destinationChainSelector: destinationChainSelector,
                receiver: message.receiver,
                data: message.data,
                extraArgs: message.extraArgs,
                fee: msg.value,
                messageId: messageId
            })
        );
    }

    /// @notice Delivers a message to `receiver`, as the router does when a message arrives.
    function deliver(address receiver, Client.Any2EVMMessage calldata message) external {
        if (!ERC165Checker.supportsInterface(receiver, type(IAny2EVMMessageReceiver).interfaceId)) {
            revert NotACcipReceiver(receiver);
        }
        IAny2EVMMessageReceiver(receiver).ccipReceive(message);
    }

    function sentCount() external view returns (uint256) {
        return _sent.length;
    }

    function getSent(uint256 index) external view returns (Sent memory) {
        return _sent[index];
    }
}

/// @notice Plays the CCIP network between mock routers: takes a recorded message from the source router and has
/// the destination router deliver it.
contract MockCcipNetwork {
    mapping(uint64 chainSelector => MockCcipRouter) public routers;

    function addRouter(MockCcipRouter router) external {
        routers[router.chainSelector()] = router;
    }

    function relay(MockCcipRouter from, uint256 index) external {
        MockCcipRouter.Sent memory sent = from.getSent(index);
        routers[sent.destinationChainSelector].deliver(
            abi.decode(sent.receiver, (address)),
            Client.Any2EVMMessage({
                messageId: sent.messageId,
                sourceChainSelector: from.chainSelector(),
                sender: abi.encode(sent.sender),
                data: sent.data,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            })
        );
    }
}
