// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { IMessageReceiver } from "../../contracts/messaging/ITransport.sol";
import { AxelarTransport } from "../../contracts/transports/AxelarTransport.sol";
import { MockAxelarGasService, MockAxelarGateway } from "../mocks/MockAxelar.sol";

contract RecordingReceiver is IMessageReceiver {
    uint64 public lastSource;
    bytes public lastMessage;
    uint256 public received;

    function receiveMessage(uint64 sourceId, bytes calldata message) external {
        lastSource = sourceId;
        lastMessage = message;
        received++;
    }

    function send(AxelarTransport transport, uint64 destinationId, bytes calldata message) external payable {
        transport.send{ value: msg.value }(destinationId, message);
    }
}

contract AxelarTransportTest is Test {
    uint64 internal constant BASE = 84_532;
    uint256 internal constant FEE = 1e8;
    bytes32 internal constant COMMAND = keccak256("command-1");

    MockAxelarGateway internal gateway = new MockAxelarGateway();
    MockAxelarGasService internal gasService = new MockAxelarGasService();
    RecordingReceiver internal receiver = new RecordingReceiver();
    AxelarTransport internal transport;
    address internal owner = makeAddr("owner");
    address internal peer = makeAddr("peer");
    address internal payer = makeAddr("payer");

    function setUp() public {
        transport = new AxelarTransport(gateway, gasService, receiver, owner);
        vm.prank(owner);
        transport.setRoute(BASE, "base-sepolia", peer, FEE);
        vm.deal(payer, 10e8);
    }

    function test_setRoute() public view {
        (string memory chain, address routePeer, uint256 fee) = transport.routes(BASE);
        assertEq(chain, "base-sepolia");
        assertEq(routePeer, peer);
        assertEq(fee, FEE);
        assertEq(transport.endpointOf(keccak256("base-sepolia")), BASE);
        assertEq(transport.quote(BASE, ""), FEE);
    }

    function test_setRoute_renamingDropsTheOldChain() public {
        vm.prank(owner);
        transport.setRoute(BASE, "base", peer, FEE);
        assertEq(transport.endpointOf(keccak256("base-sepolia")), 0);
        assertEq(transport.endpointOf(keccak256("base")), BASE);
    }

    function test_setRoute_onlyOwner() public {
        vm.expectRevert();
        transport.setRoute(1, "x", peer, 0);
    }

    function test_quote_unknownEndpoint() public {
        vm.expectRevert(abi.encodeWithSelector(AxelarTransport.UnknownEndpoint.selector, 1));
        transport.quote(1, "");
    }

    function test_send_paysGasAndCallsTheGateway() public {
        vm.prank(payer, payer);
        receiver.send{ value: FEE }(transport, BASE, "hello");

        MockAxelarGasService.Payment memory payment = gasService.lastPayment();
        assertEq(payment.sender, address(transport));
        assertEq(payment.destinationChain, "base-sepolia");
        assertEq(payment.destinationAddress, Strings.toHexString(peer));
        assertEq(payment.payloadHash, keccak256("hello"));
        assertEq(payment.refundAddress, payer);
        assertEq(payment.amount, FEE);

        MockAxelarGateway.ContractCall memory call = gateway.getCall(0);
        assertEq(call.sender, address(transport));
        assertEq(call.destinationChain, "base-sepolia");
        assertEq(call.destinationContractAddress, Strings.toHexString(peer));
        assertEq(call.payload, "hello");
    }

    function test_send_withoutFeeSkipsGasPayment() public {
        vm.prank(owner);
        transport.setRoute(BASE, "base-sepolia", peer, 0);
        receiver.send(transport, BASE, "hello");
        assertEq(gasService.paymentCount(), 0);
        assertEq(gateway.callCount(), 1);
    }

    function test_send_onlyReceiver() public {
        vm.expectRevert(abi.encodeWithSelector(AxelarTransport.NotReceiver.selector, address(this)));
        transport.send{ value: FEE }(BASE, "hello");
    }

    function test_send_rejectsInsufficientFee() public {
        vm.expectRevert(abi.encodeWithSelector(AxelarTransport.InsufficientFee.selector, FEE, FEE - 1));
        receiver.send{ value: FEE - 1 }(transport, BASE, "hello");
    }

    function test_execute_deliversApprovedMessage() public {
        string memory source = Strings.toChecksumHexString(peer);
        gateway.approveContractCall(COMMAND, "base-sepolia", source, address(transport), keccak256("hi"));
        transport.execute(COMMAND, "base-sepolia", source, "hi");

        assertEq(receiver.lastSource(), BASE);
        assertEq(receiver.lastMessage(), "hi");
    }

    function test_execute_acceptsLowercaseAddress() public {
        string memory source = Strings.toHexString(peer);
        gateway.approveContractCall(COMMAND, "base-sepolia", source, address(transport), keccak256("hi"));
        transport.execute(COMMAND, "base-sepolia", source, "hi");
        assertEq(receiver.received(), 1);
    }

    function test_execute_onlyOnce() public {
        string memory source = Strings.toHexString(peer);
        gateway.approveContractCall(COMMAND, "base-sepolia", source, address(transport), keccak256("hi"));
        transport.execute(COMMAND, "base-sepolia", source, "hi");
        vm.expectRevert(AxelarTransport.NotApprovedByGateway.selector);
        transport.execute(COMMAND, "base-sepolia", source, "hi");
    }

    function test_execute_rejectsUnapprovedMessage() public {
        vm.expectRevert(AxelarTransport.NotApprovedByGateway.selector);
        transport.execute(COMMAND, "base-sepolia", Strings.toHexString(peer), "hi");
    }

    function test_execute_rejectsUnknownChain() public {
        string memory source = Strings.toHexString(peer);
        gateway.approveContractCall(COMMAND, "avalanche", source, address(transport), keccak256("hi"));
        vm.expectRevert(abi.encodeWithSelector(AxelarTransport.UnknownSourceChain.selector, "avalanche"));
        transport.execute(COMMAND, "avalanche", source, "hi");
    }

    function test_execute_rejectsOtherSenders() public {
        string memory source = Strings.toHexString(makeAddr("attacker"));
        gateway.approveContractCall(COMMAND, "base-sepolia", source, address(transport), keccak256("hi"));
        vm.expectRevert(abi.encodeWithSelector(AxelarTransport.UnknownSourceAddress.selector, source));
        transport.execute(COMMAND, "base-sepolia", source, "hi");
    }
}
