// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { IAxelarGasService } from "../../contracts/transports/axelar/IAxelarGasService.sol";
import { IAxelarGateway } from "../../contracts/transports/axelar/IAxelarGateway.sol";
import { AxelarTransport } from "../../contracts/transports/AxelarTransport.sol";

/// @notice Test double for an Axelar gateway on one chain. It records outgoing calls, and approves incoming
/// ones only when a test (or {MockAxelarRelayer}) says so, once each.
contract MockAxelarGateway is IAxelarGateway {
    struct ContractCall {
        address sender;
        string destinationChain;
        string destinationContractAddress;
        bytes payload;
    }

    ContractCall[] internal _calls;
    mapping(bytes32 key => bool) internal _approved;

    function callContract(
        string calldata destinationChain,
        string calldata destinationContractAddress,
        bytes calldata payload
    ) external {
        _calls.push(
            ContractCall({
                sender: msg.sender,
                destinationChain: destinationChain,
                destinationContractAddress: destinationContractAddress,
                payload: payload
            })
        );
    }

    /// @notice Approves a message for `contractAddress`, as Axelar's validators would.
    function approveContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        address contractAddress,
        bytes32 payloadHash
    ) external {
        _approved[_key(commandId, sourceChain, sourceAddress, contractAddress, payloadHash)] = true;
    }

    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external returns (bool valid) {
        bytes32 key = _key(commandId, sourceChain, sourceAddress, msg.sender, payloadHash);
        valid = _approved[key];
        delete _approved[key];
    }

    function callCount() external view returns (uint256) {
        return _calls.length;
    }

    function getCall(uint256 index) external view returns (ContractCall memory) {
        return _calls[index];
    }

    function _key(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        address contractAddress,
        bytes32 payloadHash
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(commandId, sourceChain, sourceAddress, contractAddress, payloadHash));
    }
}

/// @notice Test double for Axelar's gas service. It keeps the payments and records them.
contract MockAxelarGasService is IAxelarGasService {
    struct Payment {
        address sender;
        string destinationChain;
        string destinationAddress;
        bytes32 payloadHash;
        address refundAddress;
        uint256 amount;
    }

    Payment[] internal _payments;

    function payNativeGasForContractCall(
        address sender,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        address refundAddress
    ) external payable {
        _payments.push(
            Payment({
                sender: sender,
                destinationChain: destinationChain,
                destinationAddress: destinationAddress,
                payloadHash: keccak256(payload),
                refundAddress: refundAddress,
                amount: msg.value
            })
        );
    }

    function paymentCount() external view returns (uint256) {
        return _payments.length;
    }

    function lastPayment() external view returns (Payment memory) {
        return _payments[_payments.length - 1];
    }
}

/// @notice Plays Axelar's network and relayer between two mock gateways: takes a recorded call from the
/// source gateway, approves it on the destination gateway, and executes it on the destination adapter.
contract MockAxelarRelayer {
    uint256 internal _nonce;

    function relay(
        MockAxelarGateway from,
        uint256 callIndex,
        string calldata sourceChain,
        MockAxelarGateway to,
        AxelarTransport destination
    ) external {
        MockAxelarGateway.ContractCall memory call = from.getCall(callIndex);
        string memory sourceAddress = Strings.toChecksumHexString(call.sender);
        bytes32 commandId = keccak256(abi.encode(address(from), callIndex, ++_nonce));
        to.approveContractCall(commandId, sourceChain, sourceAddress, address(destination), keccak256(call.payload));
        destination.execute(commandId, sourceChain, sourceAddress, call.payload);
    }
}
