// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { ITransport } from "../../contracts/messaging/ITransport.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { SpokeRegistry } from "../../contracts/hub/SpokeRegistry.sol";
import { MockTransport } from "../mocks/MockTransport.sol";

contract SpokeRegistryHarness is SpokeRegistry {
    constructor(address issuer) AssetToken(issuer) { }

    function send(uint64 spokeId, bytes calldata message) external payable {
        _refundUnspent(_send(spokeId, message, 0));
    }

    function broadcast(bytes calldata message) external payable {
        _refundUnspent(_broadcast(message));
    }

    function quoteBroadcast(bytes calldata message) external view returns (uint256) {
        return _quoteBroadcast(message);
    }
}

contract SpokeRegistryTest is Test {
    uint64 internal constant BASE = 84_532;
    uint64 internal constant ARBITRUM = 421_614;
    uint256 internal constant CAP = 1_000e6;

    SpokeRegistryHarness internal hub;
    MockTransport internal axelar = new MockTransport(0.5e8);
    MockTransport internal ccip = new MockTransport(0.25e8);
    address internal issuer = makeAddr("issuer");

    function setUp() public {
        hub = new SpokeRegistryHarness(issuer);
        vm.startPrank(issuer);
        hub.addSpoke(BASE, axelar, CAP);
        hub.addSpoke(ARBITRUM, ccip, CAP);
        vm.stopPrank();
        vm.deal(address(this), 10e8);
    }

    function test_addSpoke_recordsTransportAndCap() public view {
        (ITransport transport, uint256 cap, uint256 outstanding, bool registered) = hub.spokes(BASE);
        assertEq(address(transport), address(axelar));
        assertEq(cap, CAP);
        assertEq(outstanding, 0);
        assertTrue(registered);

        uint64[] memory ids = hub.spokeIds();
        assertEq(ids.length, 2);
        assertEq(ids[0], BASE);
        assertEq(ids[1], ARBITRUM);
    }

    function test_addSpoke_twiceReverts() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.SpokeAlreadyAdded.selector, BASE));
        vm.prank(issuer);
        hub.addSpoke(BASE, axelar, CAP);
    }

    function test_setters_onlyIssuer() public {
        vm.expectRevert();
        hub.addSpoke(1, axelar, CAP);
        vm.expectRevert();
        hub.setSpokeCap(BASE, 0);
        vm.expectRevert();
        hub.setSpokeTransport(BASE, ccip);
    }

    function test_setters_rejectUnknownSpoke() public {
        vm.startPrank(issuer);
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.UnknownSpoke.selector, 1));
        hub.setSpokeCap(1, 0);
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.UnknownSpoke.selector, 1));
        hub.setSpokeTransport(1, ccip);
    }

    function test_setSpokeCap() public {
        vm.prank(issuer);
        hub.setSpokeCap(BASE, 5);
        (, uint256 cap,,) = hub.spokes(BASE);
        assertEq(cap, 5);
    }

    function test_send_paysTheTransportAndRefundsTheRest() public {
        hub.send{ value: 1e8 }(BASE, "hello");

        assertEq(axelar.sentCount(), 1);
        MockTransport.Sent memory sent = axelar.lastSent();
        assertEq(sent.destinationId, BASE);
        assertEq(sent.message, "hello");
        assertEq(address(axelar).balance, 0.5e8);
        assertEq(address(this).balance, 10e8 - 0.5e8);
    }

    function test_send_rejectsInsufficientFee() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.InsufficientFee.selector, 0.5e8, 0.1e8));
        hub.send{ value: 0.1e8 }(BASE, "hello");
    }

    function test_send_rejectsDisconnectedSpoke() public {
        vm.prank(issuer);
        hub.setSpokeTransport(BASE, ITransport(address(0)));
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.SpokeDisconnected.selector, BASE));
        hub.send{ value: 1e8 }(BASE, "hello");
    }

    function test_broadcast_reachesEveryConnectedSpoke() public {
        assertEq(hub.quoteBroadcast("hello"), 0.75e8);
        hub.broadcast{ value: 0.75e8 }("hello");
        assertEq(axelar.sentCount(), 1);
        assertEq(ccip.sentCount(), 1);
        assertEq(ccip.lastSent().destinationId, ARBITRUM);
    }

    function test_broadcast_skipsDisconnectedSpokes() public {
        vm.prank(issuer);
        hub.setSpokeTransport(ARBITRUM, ITransport(address(0)));
        assertEq(hub.quoteBroadcast("hello"), 0.5e8);
        hub.broadcast{ value: 0.5e8 }("hello");
        assertEq(ccip.sentCount(), 0);
    }

    function test_broadcast_rejectsInsufficientFee() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeRegistry.InsufficientFee.selector, 0.75e8, 0.5e8));
        hub.broadcast{ value: 0.5e8 }("hello");
    }

    receive() external payable { }
}
