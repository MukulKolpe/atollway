// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Client } from "./Client.sol";

/// @title Chainlink CCIP router
/// @notice The part of the CCIP router that Atollway uses to send messages and quote their fees.
/// @dev Reference: https://docs.chain.link/ccip/api-reference
interface IRouterClient {
    /// @notice The fee to send `message`, in `message.feeToken` (the native token when it is the zero address).
    function getFee(uint64 destinationChainSelector, Client.EVM2AnyMessage memory message)
        external
        view
        returns (uint256 fee);

    /// @notice Sends `message`. In the native token, `msg.value` pays the fee from {getFee}.
    function ccipSend(uint64 destinationChainSelector, Client.EVM2AnyMessage calldata message)
        external
        payable
        returns (bytes32 messageId);
}

/// @title CCIP receiver
/// @notice Implemented by contracts that receive CCIP messages. The router calls it, and only delivers to
/// contracts that report this interface through ERC-165.
interface IAny2EVMMessageReceiver {
    function ccipReceive(Client.Any2EVMMessage calldata message) external;
}
