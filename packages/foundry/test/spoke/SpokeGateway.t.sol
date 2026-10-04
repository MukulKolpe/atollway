// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { ITransport } from "../../contracts/messaging/ITransport.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { SpokeGateway } from "../../contracts/spoke/SpokeGateway.sol";
import { SpokeToken } from "../../contracts/spoke/SpokeToken.sol";
import { MockTransport } from "../mocks/MockTransport.sol";

contract SpokeGatewayTest is Test {
    uint64 internal constant HUB = 296;
    uint256 internal constant FEE = 0.0005 ether;

    SpokeGateway internal gateway;
    SpokeToken internal token;
    MockTransport internal transport = new MockTransport(FEE);
    address internal issuer = makeAddr("issuer");
    address internal guardian = makeAddr("guardian");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        gateway = new SpokeGateway(issuer, HUB, "Atollway Fund", "ATLF", 6);
        token = gateway.token();
        vm.startPrank(issuer);
        gateway.setTransport(transport);
        gateway.setGuardian(guardian);
        vm.stopPrank();
        vm.deal(alice, 1 ether);
    }

    function test_constructor_deploysTheToken() public view {
        assertEq(token.gateway(), address(gateway));
        assertEq(token.decimals(), 6);
        assertEq(gateway.hubId(), HUB);
        assertEq(gateway.owner(), issuer);
    }

    function test_compliance_appliesNewerStatus() public {
        _status(alice, InvestorStatus.Approved, 1);
        assertTrue(gateway.isApproved(alice));
        _status(alice, InvestorStatus.Frozen, 2);
        assertFalse(gateway.isApproved(alice));
        assertEq(gateway.sequenceOf(alice), 2);
    }

    function test_compliance_ignoresStaleStatus() public {
        _status(alice, InvestorStatus.Frozen, 2);
        vm.expectEmit(address(gateway));
        emit SpokeGateway.StaleStatusIgnored(alice, InvestorStatus.Approved, 1);
        _status(alice, InvestorStatus.Approved, 1);
        assertEq(uint8(gateway.statusOf(alice)), uint8(InvestorStatus.Frozen));
    }

    function test_mint_mintsOncePerTransferId() public {
        _mint(keccak256("t1"), alice, 50e6);
        assertEq(token.balanceOf(alice), 50e6);
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.AlreadyMinted.selector, keccak256("t1")));
        _mint(keccak256("t1"), alice, 50e6);
    }

    function test_pause_fromHubStopsTransfers() public {
        _onboard(alice, 10e6);
        _status(bob, InvestorStatus.Approved, 1);
        transport.deliver(gateway, HUB, Messages.encodePause(true));
        assertTrue(gateway.paused());
        vm.expectRevert(SpokeToken.SpokePaused.selector);
        vm.prank(alice);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1);

        transport.deliver(gateway, HUB, Messages.encodePause(false));
        vm.prank(alice);
        assertTrue(token.transfer(bob, 1));
    }

    function test_guardian_pausesWithoutTheHub() public {
        vm.prank(guardian);
        gateway.pause();
        assertTrue(gateway.paused());
        vm.prank(issuer);
        gateway.unpause();
        assertFalse(gateway.paused());
    }

    function test_guardian_cannotLiftTheHubPause() public {
        transport.deliver(gateway, HUB, Messages.encodePause(true));
        vm.prank(guardian);
        gateway.unpause();
        assertTrue(gateway.paused());
    }

    function test_guardian_onlyGuardianOrOwner() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.NotGuardian.selector, alice));
        vm.prank(alice);
        gateway.pause();
    }

    function test_receive_onlyFromTransportAndHub() public {
        bytes memory message = Messages.encodePause(true);
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.NotTransport.selector, address(this)));
        gateway.receiveMessage(HUB, message);
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.UnknownSource.selector, 1));
        transport.deliver(gateway, 1, message);
    }

    function test_receive_rejectsRelease() public {
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.UnexpectedMessage.selector, Messages.RELEASE));
        transport.deliver(gateway, HUB, Messages.encodeTransfer(Messages.RELEASE, keccak256("t"), alice, 1));
    }

    function test_sendToHub_burnsAndSendsRelease() public {
        _onboard(alice, 50e6);
        assertEq(gateway.quoteSendToHub(), FEE);
        vm.prank(alice);
        bytes32 transferId = gateway.sendToHub{ value: 0.001 ether }(20e6);

        assertEq(token.balanceOf(alice), 30e6);
        assertEq(alice.balance, 1 ether - FEE);
        MockTransport.Sent memory sent = transport.lastSent();
        assertEq(sent.destinationId, HUB);
        (uint8 kind, bytes memory payload) = Messages.decode(sent.message);
        (bytes32 id, address recipient, uint256 amount) = Messages.decodeTransfer(payload);
        assertEq(kind, Messages.RELEASE);
        assertEq(id, transferId);
        assertEq(recipient, alice);
        assertEq(amount, 20e6);
    }

    function test_sendToHub_rules() public {
        _onboard(alice, 50e6);
        vm.startPrank(alice);
        vm.expectRevert(SpokeGateway.ZeroAmount.selector);
        gateway.sendToHub{ value: FEE }(0);
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.InsufficientFee.selector, FEE, FEE - 1));
        gateway.sendToHub{ value: FEE - 1 }(1);
        vm.stopPrank();

        _status(alice, InvestorStatus.Frozen, 2);
        vm.expectRevert(abi.encodeWithSelector(SpokeGateway.NotApproved.selector, alice));
        vm.prank(alice);
        gateway.sendToHub{ value: FEE }(1);

        _status(alice, InvestorStatus.Approved, 3);
        vm.prank(guardian);
        gateway.pause();
        vm.expectRevert(SpokeGateway.SpokePaused.selector);
        vm.prank(alice);
        gateway.sendToHub{ value: FEE }(1);
    }

    function test_sendToHub_needsTransport() public {
        SpokeGateway bare = new SpokeGateway(issuer, HUB, "Atollway Fund", "ATLF", 6);
        vm.expectRevert(SpokeGateway.TransportNotSet.selector);
        bare.quoteSendToHub();
    }

    function test_settings_onlyOwner() public {
        vm.startPrank(alice);
        vm.expectRevert();
        gateway.setTransport(ITransport(address(0)));
        vm.expectRevert();
        gateway.setGuardian(alice);
    }

    function _status(address account, InvestorStatus status, uint64 sequence) internal {
        transport.deliver(gateway, HUB, Messages.encodeCompliance(account, status, sequence));
    }

    function _mint(bytes32 transferId, address recipient, uint256 amount) internal {
        transport.deliver(gateway, HUB, Messages.encodeTransfer(Messages.MINT, transferId, recipient, amount));
    }

    function _onboard(address account, uint256 amount) internal {
        _status(account, InvestorStatus.Approved, 1);
        _mint(keccak256(abi.encode(account)), account, amount);
    }
}
