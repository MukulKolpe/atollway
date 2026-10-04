// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, Vm } from "forge-std/Test.sol";
import { Client } from "../../contracts/transports/ccip/Client.sol";
import { IRouterClient } from "../../contracts/transports/ccip/IRouterClient.sol";
import { CcipRelay } from "../../contracts/transports/CcipRelay.sol";

interface IRouterOnRamps {
    function getOnRamp(uint64 destinationChainSelector) external view returns (address);
}

/// @notice Runs the relay against Chainlink's real router on a fork of Base Sepolia: a message from Hedera is
/// forwarded to Robinhood Chain, and one from Robinhood Chain to Hedera, each paid from the relay's balance.
/// Skipped unless forked: `yarn foundry:simulate` runs it.
contract CcipRelayOnBaseSepoliaTest is Test {
    IRouterClient internal constant ROUTER = IRouterClient(0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93);
    uint64 internal constant HEDERA = 296;
    uint64 internal constant ROBINHOOD = 46_630;
    uint64 internal constant HEDERA_SELECTOR = 222_782_988_166_878_823;
    uint64 internal constant ROBINHOOD_SELECTOR = 2_032_988_798_112_970_440;

    CcipRelay internal relay;
    address internal issuer = makeAddr("issuer");
    address internal hubTransport = makeAddr("hubTransport");
    address internal spokeTransport = makeAddr("spokeTransport");

    function setUp() public {
        if (block.chainid != 84_532) vm.skip(true);
        relay = new CcipRelay(ROUTER, issuer);
        vm.startPrank(issuer);
        relay.setRoute(HEDERA, HEDERA_SELECTOR, hubTransport, 300_000);
        relay.setRoute(ROBINHOOD, ROBINHOOD_SELECTOR, spokeTransport, 200_000);
        vm.stopPrank();
        vm.deal(address(relay), 0.1 ether);
    }

    function test_forwardsHubToRobinhood() public {
        _assertForwarded(
            HEDERA_SELECTOR, hubTransport, abi.encode(HEDERA, ROBINHOOD, bytes("mint")), ROBINHOOD_SELECTOR
        );
    }

    function test_forwardsRobinhoodToHub() public {
        _assertForwarded(
            ROBINHOOD_SELECTOR, spokeTransport, abi.encode(ROBINHOOD, HEDERA, bytes("release")), HEDERA_SELECTOR
        );
    }

    function _assertForwarded(uint64 fromSelector, address sender, bytes memory payload, uint64 toSelector) internal {
        address onRamp = IRouterOnRamps(address(ROUTER)).getOnRamp(toSelector);
        uint256 balanceBefore = address(relay).balance;

        vm.recordLogs();
        vm.prank(address(ROUTER));
        relay.ccipReceive(
            Client.Any2EVMMessage({
                messageId: keccak256(payload),
                sourceChainSelector: fromSelector,
                sender: abi.encode(sender),
                data: payload,
                destTokenAmounts: new Client.EVMTokenAmount[](0)
            })
        );

        assertLt(address(relay).balance, balanceBefore, "the relay paid the second hop");
        bool sent;
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; i++) {
            if (logs[i].emitter == onRamp) sent = true;
        }
        assertTrue(sent, "the CCIP on-ramp recorded the forwarded message");
    }
}
