// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { InvestorRegister } from "../../contracts/hub/InvestorRegister.sol";
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
    address internal token;
    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");

    function setUp() public override {
        super.setUp();
        vm.warp(30 days);
        feed = new MockPriceFeed(8, HBAR_USD);
        hub = new SubscriptionsHarness(issuer, feed, MAX_PRICE_AGE);
        vm.deal(issuer, 100e8);
        vm.deal(alice, 1000e8);

        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.setNav(NAV);
        vm.stopPrank();
        token = hub.asset();
        _associate(token, alice);
        vm.prank(issuer);
        hub.approveInvestor(alice);
    }

    function test_constructor_setsFeedAndDefaults() public view {
        assertEq(address(hub.hbarUsdFeed()), address(feed));
        assertEq(hub.maxPriceAge(), MAX_PRICE_AGE);
        assertEq(hub.proceedsRecipient(), issuer);
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

    function test_subscribe_deliversSharesAndForwardsHbar() public {
        uint256 issuerBalance = issuer.balance;
        vm.prank(alice);
        uint256 shares = hub.subscribe{ value: 10e8 }(1_015_000);

        assertEq(shares, 1_015_000);
        assertEq(_balance(token, alice), shares);
        assertEq(hts.totalSupply(token), shares);
        assertEq(issuer.balance, issuerBalance + 10e8);
        assertEq(address(hub).balance, 0);
    }

    function test_subscribe_emitsEvent() public {
        vm.expectEmit(address(hub));
        emit Subscriptions.Subscribed(alice, 10e8, 1_015_000, HBAR_USD_PRICE);
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(0);
    }

    function test_subscribe_paysTheProceedsRecipient() public {
        address payable treasury = payable(makeAddr("treasury"));
        vm.prank(issuer);
        hub.setProceedsRecipient(treasury);
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(0);
        assertEq(treasury.balance, 10e8);
    }

    function test_subscribe_respectsMinShares() public {
        vm.expectRevert(abi.encodeWithSelector(Subscriptions.TooFewShares.selector, 1_015_000, 1_015_001));
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(1_015_001);
    }

    function test_subscribe_rejectsZeroShares() public {
        vm.expectRevert(abi.encodeWithSelector(Subscriptions.TooFewShares.selector, 0, 0));
        vm.prank(alice);
        hub.subscribe{ value: 1 }(0);
    }

    function test_subscribe_requiresApproval() public {
        address bob = makeAddr("bob");
        vm.deal(bob, 10e8);
        vm.expectRevert(abi.encodeWithSelector(InvestorRegister.NotApproved.selector, bob));
        vm.prank(bob);
        hub.subscribe{ value: 10e8 }(0);
    }

    function test_subscribe_rejectsFrozenInvestor() public {
        vm.prank(issuer);
        hub.freezeInvestor(alice);
        vm.expectRevert(abi.encodeWithSelector(InvestorRegister.NotApproved.selector, alice));
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(0);
    }

    function test_subscribe_closedWhenNavIsZero() public {
        vm.prank(issuer);
        hub.setNav(0);
        vm.expectRevert(Subscriptions.SubscriptionsClosed.selector);
        vm.prank(alice);
        hub.subscribe{ value: 10e8 }(0);
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
        vm.expectRevert();
        hub.setProceedsRecipient(payable(alice));
    }

    function test_setProceedsRecipient_rejectsZero() public {
        vm.expectRevert(Subscriptions.ZeroAddress.selector);
        vm.prank(issuer);
        hub.setProceedsRecipient(payable(address(0)));
    }

    function testFuzz_quote_matchesFormula(uint64 hbarAmount, uint64 nav) public {
        vm.assume(nav > 0);
        vm.prank(issuer);
        hub.setNav(nav);
        uint256 expected = uint256(hbarAmount) * HBAR_USD_PRICE * 1e6 / (uint256(nav) * 1e8);
        assertEq(hub.quoteSubscription(hbarAmount), expected);
    }
}
