// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { MockHederaTokenService, MockHtsToken } from "../mocks/MockHederaTokenService.sol";

/// @notice Base for tests that use the Hedera Token Service. Installs the HTS mock at `0x167`.
abstract contract HederaTest is Test {
    /// @notice HBAR sent with `createAsset`, in tinybars. The mock keeps its creation fee and refunds the rest.
    uint256 internal constant CREATION_VALUE = 20e8;

    MockHederaTokenService internal hts;

    function setUp() public virtual {
        hts = new MockHederaTokenService().install();
    }

    /// @notice Associates `account` with `token`, as an investor's wallet does through HIP-719.
    function _associate(address token, address account) internal {
        vm.prank(account);
        MockHtsToken(token).associate();
    }

    function _balance(address token, address account) internal view returns (uint256) {
        return MockHtsToken(token).balanceOf(account);
    }
}
