// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Axelar gas service
/// @notice The part of Axelar's gas service that Atollway uses: prepaying, in the native token, for a message's
/// execution on the destination chain. Axelar refunds what execution does not use to `refundAddress`.
/// @dev Reference: https://github.com/axelarnetwork/axelar-gmp-sdk-solidity
interface IAxelarGasService {
    function payNativeGasForContractCall(
        address sender,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        address refundAddress
    ) external payable;
}
