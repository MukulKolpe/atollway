// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Chainlink price feed
/// @notice The read interface of a Chainlink data feed.
/// @dev Matches Chainlink's `AggregatorV3Interface`. Feed addresses: https://docs.chain.link/data-feeds/price-feeds/addresses
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
