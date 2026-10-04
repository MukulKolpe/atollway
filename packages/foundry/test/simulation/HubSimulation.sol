// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AtollwayHub } from "../../contracts/hub/AtollwayHub.sol";
import { Messages } from "../../contracts/messaging/Messages.sol";
import { AggregatorV3Interface } from "../../contracts/oracles/AggregatorV3Interface.sol";
import { MockTransport } from "../mocks/MockTransport.sol";

/// @notice An investor wallet, played by a contract so a whole scenario runs in one simulated call.
contract SimulatedInvestor {
    constructor() payable { }

    function associate(address token) external returns (uint256 responseCode) {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("associate()"));
        require(ok, "associate() failed");
        return abi.decode(data, (uint256));
    }

    function subscribe(AtollwayHub hub, uint256 value) external returns (uint256) {
        return hub.subscribe{ value: value }(0);
    }

    function sendToSpoke(AtollwayHub hub, uint64 spokeId, uint256 amount, uint256 fee) external returns (bytes32) {
        return hub.sendToSpoke{ value: fee }(spokeId, amount);
    }

    function transfer(address token, address to, uint256 amount) external {
        require(IERC20(token).transfer(to, amount), "transfer failed");
    }

    receive() external payable { }
}

/// @notice Runs the hub against the real Hedera Token Service, as one simulated contract deployment on a
/// Hedera mirror node. Nothing is submitted to the network and no HBAR is spent.
/// `scripts-js/simulateHub.js` runs every scenario and checks the results.
/// @dev Scenario 0 runs the main flows and returns `abi.encode(string[] names, uint256[] values)` in place of
/// runtime code. Every other scenario ends with a call that Hedera must reject, so the whole simulation reverts
/// with that call's error. Mirror node simulations do not undo the storage writes of a reverted inner call,
/// which is why each expected failure runs in a simulation of its own.
contract HubSimulation {
    uint8 public constant HAPPY_PATH = 0;
    uint8 public constant APPROVE_BEFORE_ASSOCIATION = 1;
    uint8 public constant RELEASE_TO_FROZEN = 2;
    uint8 public constant SUBSCRIBE_WHILE_PAUSED = 3;
    uint8 public constant RELEASE_TO_REVOKED = 4;

    uint64 internal constant SPOKE = 84_532;
    uint256 internal constant BRIDGE_FEE = 1e8;

    string[] internal names;
    uint256[] internal values;

    AtollwayHub internal hub;
    MockTransport internal transport;
    address internal token;
    SimulatedInvestor internal alice;
    SimulatedInvestor internal bob;

    constructor(AggregatorV3Interface hbarUsdFeed, uint8 scenario) payable {
        hub = new AtollwayHub(address(this), hbarUsdFeed, 1 days);
        transport = new MockTransport(BRIDGE_FEE);
        alice = new SimulatedInvestor{ value: 25e8 }();
        bob = new SimulatedInvestor{ value: 5e8 }();

        uint256 balanceBefore = address(this).balance;
        hub.createAsset{ value: 30e8 }("Atollway Simulation", "ATLS", 6, "");
        token = hub.asset();
        _record("token creation fee (tinybars)", balanceBefore - address(this).balance);
        hub.addSpoke(SPOKE, transport, 1_000e6);
        hub.setNav(1e8);

        if (scenario == APPROVE_BEFORE_ASSOCIATION) {
            hub.approveInvestor{ value: BRIDGE_FEE }(address(bob));
        }

        _check(alice.associate(token) == 22, "alice associates");
        _check(bob.associate(token) == 22, "bob associates");
        hub.approveInvestor{ value: BRIDGE_FEE }(address(alice));
        hub.approveInvestor{ value: BRIDGE_FEE }(address(bob));
        uint256 shares = alice.subscribe(hub, 10e8);
        alice.sendToSpoke(hub, SPOKE, shares / 2, BRIDGE_FEE);

        if (scenario == RELEASE_TO_FROZEN) {
            hub.freezeInvestor{ value: BRIDGE_FEE }(address(bob));
            _release(address(bob), 1);
        } else if (scenario == SUBSCRIBE_WHILE_PAUSED) {
            hub.pause{ value: BRIDGE_FEE }();
            alice.subscribe(hub, 1e8);
        } else if (scenario == RELEASE_TO_REVOKED) {
            hub.revokeInvestor{ value: BRIDGE_FEE }(address(bob));
            _release(address(bob), 1);
        } else if (scenario == HAPPY_PATH) {
            _happyPath(shares);
        }
        revert("unknown scenario");
    }

    function _happyPath(uint256 shares) internal {
        _record("HBAR/USD price (8 decimals)", hub.hbarUsdPrice());
        _record("shares bought with 10 HBAR at a NAV of 1 USD", shares);
        _check(IERC20(token).balanceOf(address(alice)) == shares - shares / 2, "alice holds her remaining shares");
        _check(IERC20(token).totalSupply() == shares - shares / 2, "sending to a spoke burns on Hedera");

        _release(address(bob), shares / 4);
        _check(IERC20(token).balanceOf(address(bob)) == shares / 4, "release reaches bob on Hedera");
        (,, uint256 outstanding,) = hub.spokes(SPOKE);
        _check(IERC20(token).totalSupply() + outstanding == shares, "Hedera supply + outstanding = issued");
        _record("outstanding on the spoke", outstanding);

        hub.freezeInvestor{ value: BRIDGE_FEE }(address(bob));
        hub.unfreezeInvestor{ value: BRIDGE_FEE }(address(bob));
        alice.transfer(token, address(bob), 1);
        _check(IERC20(token).balanceOf(address(bob)) == shares / 4 + 1, "transfer after unfreezing works");

        hub.pause{ value: BRIDGE_FEE }();
        hub.unpause{ value: BRIDGE_FEE }();
        hub.revokeInvestor{ value: BRIDGE_FEE }(address(bob));
        _record("messages sent to the spoke", transport.sentCount());

        bytes memory result = abi.encode(names, values);
        assembly {
            return(add(result, 32), mload(result))
        }
    }

    function _release(address recipient, uint256 amount) internal {
        transport.deliver(
            hub, SPOKE, Messages.encodeTransfer(Messages.RELEASE, keccak256("spoke-transfer"), recipient, amount)
        );
    }

    function _record(string memory name, uint256 value) internal {
        names.push(name);
        values.push(value);
    }

    function _check(bool condition, string memory what) internal pure {
        require(condition, string.concat("check failed: ", what));
    }
}
