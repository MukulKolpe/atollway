// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, Vm } from "forge-std/Test.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { SpokeGateway } from "../../contracts/spoke/SpokeGateway.sol";
import { AxelarTransport } from "../../contracts/transports/AxelarTransport.sol";
import { IAxelarGasService } from "../../contracts/transports/axelar/IAxelarGasService.sol";
import { IAxelarGateway } from "../../contracts/transports/axelar/IAxelarGateway.sol";

/// @notice Runs the spoke against Axelar's real gateway and gas service on a fork of Base Sepolia. Skipped
/// unless forked: `yarn foundry:simulate` runs it with `--fork-url https://sepolia.base.org`.
contract SpokeOnBaseSepoliaTest is Test {
    IAxelarGateway internal constant GATEWAY = IAxelarGateway(0xe432150cce91c13a887f7D836923d5597adD8E31);
    IAxelarGasService internal constant GAS_SERVICE = IAxelarGasService(0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6);
    bytes32 internal constant CONTRACT_CALL = keccak256("ContractCall(address,string,string,bytes32,bytes)");
    uint64 internal constant HEDERA = 296;
    uint256 internal constant FEE = 0.0005 ether;

    SpokeGateway internal spoke;
    AxelarTransport internal transport;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal hubTransport = makeAddr("hubTransport");

    function setUp() public {
        if (block.chainid != 84_532) vm.skip(true);
        spoke = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        transport = new AxelarTransport(GATEWAY, GAS_SERVICE, spoke, issuer);
        vm.startPrank(issuer);
        transport.setRoute(HEDERA, "hedera", hubTransport, FEE);
        spoke.setTransport(transport);
        vm.stopPrank();

        // Stand in for messages from the hub: approve Alice and give her 10 shares.
        vm.startPrank(address(transport));
        spoke.receiveMessage(HEDERA, Messages.encodeCompliance(alice, InvestorStatus.Approved, 1));
        spoke.receiveMessage(HEDERA, Messages.encodeTransfer(Messages.MINT, keccak256("t1"), alice, 10e6));
        vm.stopPrank();
        vm.deal(alice, 1 ether);
    }

    function test_sendToHub_paysAxelarAndCallsTheGateway() public {
        uint256 gasServiceBefore = address(GAS_SERVICE).balance;
        vm.recordLogs();
        vm.prank(alice, alice);
        spoke.sendToHub{ value: FEE }(4e6);

        assertEq(address(GAS_SERVICE).balance - gasServiceBefore, FEE);
        assertEq(spoke.token().balanceOf(alice), 6e6);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool called;
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].emitter == address(GATEWAY) && logs[i].topics[0] == CONTRACT_CALL) {
                assertEq(logs[i].topics[1], bytes32(uint256(uint160(address(transport)))));
                (string memory chain, string memory destination,) = abi.decode(logs[i].data, (string, string, bytes));
                assertEq(chain, "hedera");
                assertEq(destination, Strings.toHexString(hubTransport));
                called = true;
            }
        }
        assertTrue(called, "the Axelar gateway emitted ContractCall");
    }

    function test_execute_rejectsMessagesAxelarDidNotApprove() public {
        vm.expectRevert(AxelarTransport.NotApprovedByGateway.selector);
        transport.execute(keccak256("unknown"), "hedera", vm.toString(hubTransport), "");
    }
}
