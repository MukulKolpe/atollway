// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { AggregatorV3Interface } from "../oracles/AggregatorV3Interface.sol";
import { InvestorRegister } from "./InvestorRegister.sol";

/// @title Subscriptions
/// @notice Prices new shares for HBAR at the net asset value (NAV) the issuer sets. HBAR is valued in US dollars
/// with a Chainlink HBAR/USD feed, and stale prices are rejected.
/// @dev Inside the Hedera EVM, `msg.value` is in tinybars (10^-8 HBAR). Wallets and JSON-RPC use 18 decimals,
/// and the relay converts between them.
abstract contract Subscriptions is InvestorRegister {
    /// @notice Decimals of {nav}: a NAV of 1e8 means 1 US dollar per share.
    uint8 public constant NAV_DECIMALS = 8;

    /// @notice The Chainlink HBAR/USD feed.
    AggregatorV3Interface public immutable hbarUsdFeed;

    uint8 internal immutable _priceDecimals;

    /// @notice US dollars per share, with {NAV_DECIMALS} decimals. Zero closes subscriptions.
    uint256 public nav;

    /// @notice The oldest HBAR/USD price, in seconds, that subscriptions accept.
    uint256 public maxPriceAge;

    event NavUpdated(uint256 nav);
    event MaxPriceAgeUpdated(uint256 maxPriceAge);

    error InvalidPrice(int256 answer);
    error StalePrice(uint256 updatedAt);
    error SubscriptionsClosed();

    constructor(AggregatorV3Interface feed, uint256 maxPriceAge_) {
        hbarUsdFeed = feed;
        _priceDecimals = feed.decimals();
        maxPriceAge = maxPriceAge_;
    }

    /// @notice Sets the NAV per share in US dollars, with {NAV_DECIMALS} decimals. Zero closes subscriptions.
    function setNav(uint256 newNav) external onlyOwner {
        nav = newNav;
        emit NavUpdated(newNav);
    }

    /// @notice Sets the oldest HBAR/USD price, in seconds, that subscriptions accept. Match it to the feed's
    /// heartbeat.
    function setMaxPriceAge(uint256 newMaxPriceAge) external onlyOwner {
        maxPriceAge = newMaxPriceAge;
        emit MaxPriceAgeUpdated(newMaxPriceAge);
    }

    /// @notice The current HBAR/USD price, in the feed's decimals. Reverts if it is not positive or too old.
    function hbarUsdPrice() public view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = hbarUsdFeed.latestRoundData();
        if (answer <= 0) revert InvalidPrice(answer);
        if (updatedAt + maxPriceAge < block.timestamp) revert StalePrice(updatedAt);
        return SafeCast.toUint256(answer);
    }

    /// @notice How many shares `hbarAmount` tinybars buy now, in the asset's smallest unit.
    function quoteSubscription(uint256 hbarAmount) public view returns (uint256 shares) {
        (shares,) = _quote(hbarAmount);
    }

    /// @dev shares = HBAR value in US dollars / NAV. The HBAR (8 decimals) and NAV (8 decimals) scales cancel out.
    function _quote(uint256 hbarAmount) internal view returns (uint256 shares, uint256 price) {
        if (nav == 0) revert SubscriptionsClosed();
        price = hbarUsdPrice();
        shares = Math.mulDiv(hbarAmount * price, 10 ** assetDecimals, nav * 10 ** _priceDecimals);
    }
}
