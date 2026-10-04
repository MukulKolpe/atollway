// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";

contract MessagesTest is Test {
    address internal constant ALICE = 0x00000000000000000000000000000000000A11cE;

    function test_compliance_roundTrip() public pure {
        bytes memory message = Messages.encodeCompliance(ALICE, InvestorStatus.Frozen, 7);
        (uint8 kind, bytes memory payload) = Messages.decode(message);
        (address account, InvestorStatus status, uint64 sequence) = Messages.decodeCompliance(payload);

        assertEq(kind, Messages.COMPLIANCE);
        assertEq(account, ALICE);
        assertEq(uint8(status), uint8(InvestorStatus.Frozen));
        assertEq(sequence, 7);
    }

    function test_transfer_roundTrip() public pure {
        bytes memory message = Messages.encodeTransfer(Messages.RELEASE, keccak256("id"), ALICE, 1_015_000);
        (uint8 kind, bytes memory payload) = Messages.decode(message);
        (bytes32 transferId, address recipient, uint256 amount) = Messages.decodeTransfer(payload);

        assertEq(kind, Messages.RELEASE);
        assertEq(transferId, keccak256("id"));
        assertEq(recipient, ALICE);
        assertEq(amount, 1_015_000);
    }

    function test_pause_roundTrip() public pure {
        (uint8 kind, bytes memory payload) = Messages.decode(Messages.encodePause(true));
        assertEq(kind, Messages.PAUSE);
        assertTrue(Messages.decodePause(payload));
    }

    /// @notice Fixes the wire format, so spokes written in other languages can check their encoders against it.
    function test_compliance_wireFormat() public pure {
        bytes memory message = Messages.encodeCompliance(ALICE, InvestorStatus.Approved, 1);
        bytes memory expected = abi.encodePacked(
            uint256(1), // version
            uint256(1), // kind: COMPLIANCE
            uint256(0x60), // payload offset
            uint256(0x60), // payload length
            uint256(uint160(ALICE)), // account
            uint256(1), // status: Approved
            uint256(1) // sequence
        );
        assertEq(message, expected);
    }

    function test_decode_rejectsOtherVersions() public {
        bytes memory message = abi.encode(uint8(2), Messages.PAUSE, abi.encode(true));
        vm.expectRevert(abi.encodeWithSelector(Messages.UnsupportedVersion.selector, 2));
        this.decode(message);
    }

    function test_encodeTransfer_rejectsOtherKinds() public {
        vm.expectRevert(abi.encodeWithSelector(Messages.NotATransferKind.selector, Messages.PAUSE));
        this.encodeTransfer(Messages.PAUSE);
    }

    function test_decodeCompliance_rejectsUnknownStatus() public {
        bytes memory payload = abi.encode(ALICE, uint8(9), uint64(1));
        vm.expectRevert();
        this.decodeCompliance(payload);
    }

    function decode(bytes memory message) external pure returns (uint8 kind, bytes memory payload) {
        return Messages.decode(message);
    }

    function encodeTransfer(uint8 kind) external pure returns (bytes memory) {
        return Messages.encodeTransfer(kind, bytes32(0), ALICE, 1);
    }

    function decodeCompliance(bytes memory payload) external pure returns (address, InvestorStatus, uint64) {
        return Messages.decodeCompliance(payload);
    }
}
