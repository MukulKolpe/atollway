// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { Subscriptions } from "../../contracts/hub/Subscriptions.sol";
import { AggregatorV3Interface } from "../../contracts/oracles/AggregatorV3Interface.sol";
import { MockPriceFeed } from "../mocks/MockPriceFeed.sol";
import { HederaTest } from "../utils/HederaTest.sol";

contract SubscriptionsHarness is Subscriptions {
    constructor(address issuer, AggregatorV3Interface feed, uint256 maxPriceAge)
        AssetToken(issuer)
        Subscriptions(feed, maxPriceAge)
    { }

    function _afterStatusChange(address, InvestorStatus, uint64) internal override { }
}

contract SubscriptionsTest is HederaTest {
    /// @notice HBAR/USD at 0.1015 US dollars, with 8 decimals.
    int256 internal constant HBAR_USD = 10_150_000;
    uint256 internal constant HBAR_USD_PRICE = 10_150_000;
    uint256 internal constant MAX_PRICE_AGE = 1 days;
    /// @notice 1 US dollar per share.
    uint256 internal constant NAV = 1e8;

    SubscriptionsHarness internal hub;
    MockPriceFeed internal feed;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");

    function setUp() public override {
        super.setUp();
        vm.warp(30 days);
        feed = new MockPriceFeed(8, HBAR_USD);
        hub = new SubscriptionsHarness(issuer, feed, MAX_PRICE_AGE);
        vm.deal(issuer, 100e8);

        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.setNav(NAV);
        vm.stopPrank();
    }

    function test_constructor_setsFeedAndDefaults() public view {
        assertEq(address(hub.hbarUsdFeed()), address(feed));
        assertEq(hub.maxPriceAge(), MAX_PRICE_AGE);
    }

    function test_quote_valuesHbarAtTheFeedPrice() public view {
        // 10 HBAR x 0.1015 USD = 1.015 USD, at 1 USD per share = 1.015 shares (6 decimals).
        assertEq(hub.quoteSubscription(10e8), 1_015_000);
    }

    function test_quote_usesTheNav() public {
        vm.prank(issuer);
        hub.setNav(2.5e8);
        assertEq(hub.quoteSubscription(10e8), 406_000);
    }

    function test_quote_closedWhenNavIsZero() public {
        vm.prank(issuer);
        hub.setNav(0);
        vm.expectRevert(Subscriptions.SubscriptionsClosed.selector);
        hub.quoteSubscription(10e8);
    }

    function test_price_rejectsStaleFeed() public {
        uint256 updatedAt = block.timestamp - MAX_PRICE_AGE - 1;
        feed.setAnswer(HBAR_USD, updatedAt);
        vm.expectRevert(abi.encodeWithSelector(Subscriptions.StalePrice.selector, updatedAt));
        hub.hbarUsdPrice();
    }

    function test_price_acceptsFeedAtMaxAge() public {
        feed.setAnswer(HBAR_USD, block.timestamp - MAX_PRICE_AGE);
        assertEq(hub.hbarUsdPrice(), HBAR_USD_PRICE);
    }

    function test_price_rejectsNonPositiveAnswer() public {
        feed.setAnswer(0);
        vm.expectRevert(abi.encodeWithSelector(Subscriptions.InvalidPrice.selector, int256(0)));
        hub.hbarUsdPrice();
    }

    function test_settings_onlyIssuer() public {
        vm.startPrank(alice);
        vm.expectRevert();
        hub.setNav(1);
        vm.expectRevert();
        hub.setMaxPriceAge(1);
    }

    function testFuzz_quote_matchesFormula(uint64 hbarAmount, uint64 nav) public {
        vm.assume(nav > 0);
        vm.prank(issuer);
        hub.setNav(nav);
        uint256 expected = uint256(hbarAmount) * HBAR_USD_PRICE * 1e6 / (uint256(nav) * 1e8);
        assertEq(hub.quoteSubscription(hbarAmount), expected);
    }
}
