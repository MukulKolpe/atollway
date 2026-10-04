// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Axelar gateway
/// @notice The part of Axelar's gateway contract that Atollway uses. Both the consensus gateway (Base Sepolia)
/// and the Amplifier gateway (Hedera) implement it.
/// @dev Reference: https://github.com/axelarnetwork/axelar-gmp-sdk-solidity
interface IAxelarGateway {
    /// @notice Sends `payload` to `destinationContractAddress` on `destinationChain`, an Axelar chain name.
    function callContract(
        string calldata destinationChain,
        string calldata destinationContractAddress,
        bytes calldata payload
    ) external;

    /// @notice Returns true, once, if Axelar approved this message for the caller. Marks it as executed.
    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external returns (bool);
}
