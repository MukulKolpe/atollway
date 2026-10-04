// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, Vm } from "forge-std/Test.sol";
import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { SpokeGateway } from "../../contracts/spoke/SpokeGateway.sol";
import { Client } from "../../contracts/transports/ccip/Client.sol";
import { IRouterClient } from "../../contracts/transports/ccip/IRouterClient.sol";
import { CcipTransport } from "../../contracts/transports/CcipTransport.sol";

interface IRouterOnRamps {
    function getOnRamp(uint64 destinationChainSelector) external view returns (address);
}

/// @notice Runs a CCIP spoke against Chainlink's real router on a fork of Arbitrum Sepolia, which has a direct
/// lane to Hedera, or of Robinhood Chain testnet, which reaches Hedera through the relay on Base. Skipped unless
/// forked from one of them: `yarn foundry:simulate` runs it.
contract CcipSpokeOnTestnetTest is Test {
    uint64 internal constant HEDERA = 296;
    uint64 internal constant HEDERA_SELECTOR = 222_782_988_166_878_823;
    uint64 internal constant BASE_SELECTOR = 10_344_971_235_874_465_080;

    IRouterClient internal router;
    uint64 internal hubLaneSelector; // the chain the first hop goes to: Hedera, or Base for the relay
    SpokeGateway internal spoke;
    CcipTransport internal transport;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal hubPeer = makeAddr("hubPeer");

    function setUp() public {
        if (block.chainid == 421_614) {
            router = IRouterClient(0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165);
            hubLaneSelector = HEDERA_SELECTOR;
        } else if (block.chainid == 46_630) {
            router = IRouterClient(0x30D197C6F5bE050D5525dD94d01760FaCdB67e7C);
            hubLaneSelector = BASE_SELECTOR;
        } else {
            vm.skip(true);
        }
        spoke = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        transport = new CcipTransport(router, spoke, uint64(block.chainid), issuer);
        vm.startPrank(issuer);
        transport.setRoute(HEDERA, hubLaneSelector, hubPeer, 300_000);
        spoke.setTransport(transport);
        vm.stopPrank();

        // Stand in for the hub's messages: approve Alice and give her 10 shares, through the real router.
        _fromHub(Messages.encodeCompliance(alice, InvestorStatus.Approved, 1));
        _fromHub(Messages.encodeTransfer(Messages.MINT, keccak256("t1"), alice, 10e6));
        vm.deal(alice, 1 ether);
    }

    function test_receive_fromTheRealRouter() public view {
        assertTrue(spoke.isApproved(alice));
        assertEq(spoke.token().balanceOf(alice), 10e6);
    }

    function test_sendToHub_paysTheRouterQuote() public {
        uint256 fee = spoke.quoteSendToHub();
        assertGt(fee, 0);
        address onRamp = IRouterOnRamps(address(router)).getOnRamp(hubLaneSelector);

        vm.recordLogs();
        vm.prank(alice, alice);
        spoke.sendToHub{ value: fee }(4e6);

        assertEq(alice.balance, 1 ether - fee);
        assertEq(spoke.token().balanceOf(alice), 6e6);
        bool sent;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].emitter == onRamp) sent = true;
        }
        assertTrue(sent, "the CCIP on-ramp recorded the message");
    }

    function _fromHub(bytes memory message) internal {
        vm.prank(address(router));
        transport.ccipReceive(
            Client.Any2EVMMessage({
                messageId: keccak256(message),
                sourceChainSelector: hubLaneSelector,
                sender: abi.encode(hubPeer),
                data: abi.encode(HEDERA, uint64(block.chainid), message),
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            })
        );
    }
}
