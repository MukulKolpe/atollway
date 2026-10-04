// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { ISpokeCompliance, SpokeToken } from "../../contracts/spoke/SpokeToken.sol";

/// @notice Plays the spoke gateway: it deploys the token and answers its compliance questions.
contract SpokeTokenTest is Test, ISpokeCompliance {
    SpokeToken internal token;
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    bool public paused;
    mapping(address account => bool) public isApproved;

    function setUp() public {
        token = new SpokeToken("Atollway Fund", "ATLF", 6);
        isApproved[alice] = true;
        isApproved[bob] = true;
        token.mint(alice, 100e6);
    }

    function test_metadata() public view {
        assertEq(token.name(), "Atollway Fund");
        assertEq(token.symbol(), "ATLF");
        assertEq(token.decimals(), 6);
        assertEq(token.gateway(), address(this));
    }

    function test_transfer_betweenApprovedInvestors() public {
        vm.prank(alice);
        assertTrue(token.transfer(bob, 40e6));
        assertEq(token.balanceOf(bob), 40e6);
    }

    function test_transfer_needsApprovedSender() public {
        isApproved[alice] = false;
        vm.expectRevert(abi.encodeWithSelector(SpokeToken.NotApproved.selector, alice));
        vm.prank(alice);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1);
    }

    function test_transfer_needsApprovedRecipient() public {
        address carol = makeAddr("carol");
        vm.expectRevert(abi.encodeWithSelector(SpokeToken.NotApproved.selector, carol));
        vm.prank(alice);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(carol, 1);
    }

    function test_transferFrom_followsTheSameRules() public {
        vm.prank(alice);
        token.approve(bob, 10e6);
        isApproved[bob] = false;
        vm.expectRevert(abi.encodeWithSelector(SpokeToken.NotApproved.selector, bob));
        vm.prank(bob);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transferFrom(alice, bob, 10e6);
    }

    function test_transfer_stopsWhilePaused() public {
        paused = true;
        vm.expectRevert(SpokeToken.SpokePaused.selector);
        vm.prank(alice);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        token.transfer(bob, 1);
    }

    function test_mintAndBurn_onlyGateway() public {
        vm.startPrank(alice);
        vm.expectRevert(SpokeToken.OnlyGateway.selector);
        token.mint(alice, 1);
        vm.expectRevert(SpokeToken.OnlyGateway.selector);
        token.burn(alice, 1);
    }

    function test_mintAndBurn_skipTheApprovalCheck() public {
        isApproved[alice] = false;
        paused = true;
        token.mint(alice, 5e6);
        token.burn(alice, 105e6);
        assertEq(token.totalSupply(), 0);
    }
}
