// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice What the spoke token asks its gateway before every transfer.
interface ISpokeCompliance {
    /// @notice Whether transfers on this spoke are stopped, by the hub or by the local guardian.
    function paused() external view returns (bool);

    /// @notice Whether `account` is approved and not frozen, as last decided by the hub.
    function isApproved(address account) external view returns (bool);
}

/// @title Spoke token
/// @notice The asset's mirror on a spoke chain. Only the spoke gateway, which deploys it, can mint and burn.
/// A transfer between two accounts needs both to be approved by the hub, and fails while the spoke is paused.
/// @dev Minting and burning skip the approval check: the hub only sends shares to approved investors, and
/// the gateway checks approval before burning. See docs/architecture.md.
contract SpokeToken is ERC20 {
    /// @notice The spoke gateway, which mints, burns and holds the compliance state.
    address public immutable gateway;

    uint8 private immutable _decimals;

    error OnlyGateway();
    error SpokePaused();
    error NotApproved(address account);

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        gateway = msg.sender;
        _decimals = decimals_;
    }

    modifier onlyGateway() {
        _checkGateway();
        _;
    }

    /// @notice The same decimals as the asset on Hedera, so amounts map one to one.
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyGateway {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyGateway {
        _burn(from, amount);
    }

    function _checkGateway() internal view {
        if (msg.sender != gateway) revert OnlyGateway();
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            ISpokeCompliance compliance = ISpokeCompliance(gateway);
            if (compliance.paused()) revert SpokePaused();
            if (!compliance.isApproved(from)) revert NotApproved(from);
            if (!compliance.isApproved(to)) revert NotApproved(to);
        }
        super._update(from, to, value);
    }
}
