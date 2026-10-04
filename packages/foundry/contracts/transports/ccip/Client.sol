// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Chainlink CCIP message types
/// @notice The message structs and extra-arguments encoding used by Chainlink CCIP routers.
/// @dev Names and layouts match Chainlink's `Client` library, so they keep Chainlink's capitalisation.
/// Reference: https://docs.chain.link/ccip/api-reference
library Client {
    // forge-lint: disable-next-line(pascal-case-struct)
    struct EVMTokenAmount {
        address token;
        uint256 amount;
    }

    /// @notice A message as delivered to a receiver's `ccipReceive`.
    // forge-lint: disable-next-line(pascal-case-struct)
    struct Any2EVMMessage {
        bytes32 messageId;
        uint64 sourceChainSelector;
        bytes sender; // abi.encode(address) for EVM senders
        bytes data;
        EVMTokenAmount[] destTokenAmounts;
    }

    /// @notice A message as sent to the router.
    // forge-lint: disable-next-line(pascal-case-struct)
    struct EVM2AnyMessage {
        bytes receiver; // abi.encode(address) for EVM receivers
        bytes data;
        EVMTokenAmount[] tokenAmounts;
        address feeToken; // address(0) pays in the native token
        bytes extraArgs;
    }

    /// @notice Tag of the generic extra arguments, version 2: `bytes4(keccak256("CCIP EVMExtraArgsV2"))`.
    bytes4 internal constant GENERIC_EXTRA_ARGS_V2_TAG = 0x181dcf10;

    /// @notice Gas for the receiver's `ccipReceive` on the destination chain, and whether the message may be
    /// executed out of order with other messages from the same sender.
    struct GenericExtraArgsV2 {
        uint256 gasLimit;
        bool allowOutOfOrderExecution;
    }

    function argsToBytes(GenericExtraArgsV2 memory args) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(GENERIC_EXTRA_ARGS_V2_TAG, args);
    }
}
