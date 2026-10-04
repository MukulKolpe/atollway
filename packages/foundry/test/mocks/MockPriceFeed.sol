// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AggregatorV3Interface } from "../../contracts/oracles/AggregatorV3Interface.sol";

/// @notice Test double for a Chainlink price feed with a settable answer and update time.
contract MockPriceFeed is AggregatorV3Interface {
    uint8 public immutable decimals;
    int256 public answer;
    uint256 public updatedAt;

    constructor(uint8 decimals_, int256 answer_) {
        decimals = decimals_;
        setAnswer(answer_);
    }

    /// @notice Sets the answer, updated now.
    function setAnswer(int256 answer_) public {
        setAnswer(answer_, block.timestamp);
    }

    function setAnswer(int256 answer_, uint256 updatedAt_) public {
        answer = answer_;
        updatedAt = updatedAt_;
    }

    function description() external pure returns (string memory) {
        return "HBAR / USD";
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
