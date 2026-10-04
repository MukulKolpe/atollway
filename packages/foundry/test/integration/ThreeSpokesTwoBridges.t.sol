// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { InvestorStatus } from "../../contracts/common/InvestorStatus.sol";
import { AtollwayHub } from "../../contracts/hub/AtollwayHub.sol";
import { SpokeGateway } from "../../contracts/spoke/SpokeGateway.sol";
import { SpokeToken } from "../../contracts/spoke/SpokeToken.sol";
import { AxelarTransport } from "../../contracts/transports/AxelarTransport.sol";
import { CcipRelay } from "../../contracts/transports/CcipRelay.sol";
import { CcipTransport } from "../../contracts/transports/CcipTransport.sol";
import { MockAxelarGasService, MockAxelarGateway, MockAxelarRelayer } from "../mocks/MockAxelar.sol";
import { MockCcipNetwork, MockCcipRouter } from "../mocks/MockCcip.sol";
import { MockPriceFeed } from "../mocks/MockPriceFeed.sol";
import { HederaTest } from "../utils/HederaTest.sol";

/// @notice One hub and three spokes: Base Sepolia over Axelar, Arbitrum Sepolia over CCIP, and Robinhood Chain
/// over CCIP through the relay on Base. Mock gateways, routers and relayers stand in for the bridges' networks.
contract ThreeSpokesTwoBridgesTest is HederaTest {
    uint64 internal constant HEDERA = 296;
    uint64 internal constant BASE = 84_532;
    uint64 internal constant ARBITRUM = 421_614;
    uint64 internal constant ROBINHOOD = 46_630;
    uint64 internal constant HEDERA_SELECTOR = 222_782_988_166_878_823;
    uint64 internal constant BASE_SELECTOR = 10_344_971_235_874_465_080;
    uint64 internal constant ARBITRUM_SELECTOR = 3_478_487_238_524_512_106;
    uint64 internal constant ROBINHOOD_SELECTOR = 2_032_988_798_112_970_440;

    AtollwayHub internal hub;
    address internal asset;
    SpokeGateway internal base;
    SpokeGateway internal arbitrum;
    SpokeGateway internal robinhood;
    CcipRelay internal relay;

    MockAxelarGateway internal hederaAxelar = new MockAxelarGateway();
    MockAxelarGateway internal baseAxelar = new MockAxelarGateway();
    MockAxelarRelayer internal axelarRelayer = new MockAxelarRelayer();
    AxelarTransport internal hubAxelar;
    AxelarTransport internal baseAxelarTransport;

    MockCcipNetwork internal ccip = new MockCcipNetwork();
    MockCcipRouter internal hederaRouter = new MockCcipRouter(HEDERA_SELECTOR, 3e8);
    MockCcipRouter internal baseRouter = new MockCcipRouter(BASE_SELECTOR, 0.0001 ether);
    MockCcipRouter internal arbitrumRouter = new MockCcipRouter(ARBITRUM_SELECTOR, 0.0001 ether);
    MockCcipRouter internal robinhoodRouter = new MockCcipRouter(ROBINHOOD_SELECTOR, 0.0001 ether);
    MockCcipRouter[4] internal routers;
    uint256[4] internal delivered;
    uint256 internal axelarToBase;
    uint256 internal axelarToHub;

    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public override {
        super.setUp();
        vm.warp(30 days);
        routers = [hederaRouter, baseRouter, arbitrumRouter, robinhoodRouter];
        for (uint256 i; i < 4; i++) {
            ccip.addRouter(routers[i]);
        }
        vm.deal(issuer, 1_000e8 + 10 ether);
        vm.deal(alice, 10_000e8 + 10 ether);
        vm.deal(bob, 10_000e8 + 10 ether);

        vm.startPrank(issuer);
        hub = new AtollwayHub(issuer, new MockPriceFeed(8, 10_150_000), 1 days);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        hub.setNav(1e8);
        asset = hub.asset();
        base = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        arbitrum = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);
        robinhood = new SpokeGateway(issuer, HEDERA, "Atollway Fund", "ATLF", 6);

        // Base Sepolia over Axelar.
        hubAxelar = new AxelarTransport(hederaAxelar, new MockAxelarGasService(), hub, issuer);
        baseAxelarTransport = new AxelarTransport(baseAxelar, new MockAxelarGasService(), base, issuer);
        hubAxelar.setRoute(BASE, "base-sepolia", address(baseAxelarTransport), 1e8);
        baseAxelarTransport.setRoute(HEDERA, "hedera", address(hubAxelar), 0.0005 ether);
        base.setTransport(baseAxelarTransport);
        hub.addSpoke(BASE, hubAxelar, 1_000e6);

        // Arbitrum Sepolia over CCIP, and Robinhood Chain over CCIP through the relay on Base.
        CcipTransport hubCcip = new CcipTransport(hederaRouter, hub, HEDERA, issuer);
        CcipTransport arbitrumCcip = new CcipTransport(arbitrumRouter, arbitrum, ARBITRUM, issuer);
        CcipTransport robinhoodCcip = new CcipTransport(robinhoodRouter, robinhood, ROBINHOOD, issuer);
        relay = new CcipRelay(baseRouter, issuer);
        hubCcip.setRoute(ARBITRUM, ARBITRUM_SELECTOR, address(arbitrumCcip), 200_000);
        hubCcip.setRoute(ROBINHOOD, BASE_SELECTOR, address(relay), 300_000);
        arbitrumCcip.setRoute(HEDERA, HEDERA_SELECTOR, address(hubCcip), 300_000);
        robinhoodCcip.setRoute(HEDERA, BASE_SELECTOR, address(relay), 300_000);
        relay.setRoute(HEDERA, HEDERA_SELECTOR, address(hubCcip), 300_000);
        relay.setRoute(ROBINHOOD, ROBINHOOD_SELECTOR, address(robinhoodCcip), 200_000);
        arbitrum.setTransport(arbitrumCcip);
        robinhood.setTransport(robinhoodCcip);
        hub.addSpoke(ARBITRUM, hubCcip, 1_000e6);
        hub.addSpoke(ROBINHOOD, hubCcip, 1_000e6);
        (bool funded,) = address(relay).call{ value: 1 ether }("");
        assertTrue(funded);
        vm.stopPrank();

        _associate(asset, alice);
        _associate(asset, bob);
        _issuer(abi.encodeCall(hub.approveInvestor, (alice)));
        _issuer(abi.encodeCall(hub.approveInvestor, (bob)));
        _flush();
    }

    function test_approvals_reachEverySpoke() public view {
        assertTrue(base.isApproved(alice) && arbitrum.isApproved(alice) && robinhood.isApproved(alice));
        assertTrue(base.isApproved(bob) && arbitrum.isApproved(bob) && robinhood.isApproved(bob));
    }

    function test_freezeAndPause_reachEverySpoke() public {
        _issuer(abi.encodeCall(hub.freezeInvestor, (alice)));
        _issuer(abi.encodeCall(hub.pause, ()));
        _flush();
        assertEq(uint8(robinhood.statusOf(alice)), uint8(InvestorStatus.Frozen));
        assertEq(uint8(arbitrum.statusOf(alice)), uint8(InvestorStatus.Frozen));
        assertTrue(base.paused() && arbitrum.paused() && robinhood.paused());
    }

    function test_sharesTravelEveryRouteAndSupplyIsConserved() public {
        vm.prank(alice);
        uint256 issued = hub.subscribe{ value: 1_000e8 }(0);

        uint64[3] memory spokeIds = [BASE, ARBITRUM, ROBINHOOD];
        for (uint256 i; i < 3; i++) {
            uint256 fee = hub.quoteSendToSpoke(spokeIds[i]);
            vm.prank(alice);
            hub.sendToSpoke{ value: fee }(spokeIds[i], 20e6);
        }
        _flush();
        assertEq(base.token().balanceOf(alice), 20e6);
        assertEq(arbitrum.token().balanceOf(alice), 20e6);
        assertEq(robinhood.token().balanceOf(alice), 20e6);
        _assertSupply(issued);

        // Alice pays Bob on Robinhood Chain; Bob brings the shares home through the relay.
        SpokeToken robinhoodToken = robinhood.token();
        vm.prank(alice);
        assertTrue(robinhoodToken.transfer(bob, 15e6));
        uint256 relayFee = robinhood.quoteSendToHub();
        vm.prank(bob);
        robinhood.sendToHub{ value: relayFee }(15e6);
        uint256 arbitrumFee = arbitrum.quoteSendToHub();
        vm.prank(alice);
        arbitrum.sendToHub{ value: arbitrumFee }(5e6);
        _flush();

        assertEq(_balance(asset, bob), 15e6);
        assertEq(robinhoodToken.totalSupply(), 5e6);
        assertEq(arbitrum.token().totalSupply(), 15e6);
        _assertSupply(issued);
    }

    function _issuer(bytes memory call) internal {
        uint256 fee = hub.quoteComplianceBroadcast();
        vm.prank(issuer);
        (bool ok, bytes memory reason) = address(hub).call{ value: fee }(call);
        if (!ok) {
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }

    /// @dev Delivers every pending message on both bridges until none are left, including the relay's second hops.
    function _flush() internal {
        bool moved = true;
        while (moved) {
            moved = false;
            for (; axelarToBase < hederaAxelar.callCount(); axelarToBase++) {
                axelarRelayer.relay(hederaAxelar, axelarToBase, "hedera", baseAxelar, baseAxelarTransport);
                moved = true;
            }
            for (; axelarToHub < baseAxelar.callCount(); axelarToHub++) {
                axelarRelayer.relay(baseAxelar, axelarToHub, "base-sepolia", hederaAxelar, hubAxelar);
                moved = true;
            }
            for (uint256 i; i < 4; i++) {
                for (; delivered[i] < routers[i].sentCount(); delivered[i]++) {
                    ccip.relay(routers[i], delivered[i]);
                    moved = true;
                }
            }
        }
    }

    function _assertSupply(uint256 issued) internal view {
        uint256 outstanding;
        uint64[3] memory spokeIds = [BASE, ARBITRUM, ROBINHOOD];
        SpokeGateway[3] memory gateways = [base, arbitrum, robinhood];
        for (uint256 i; i < 3; i++) {
            (,, uint256 spokeOutstanding,) = hub.spokes(spokeIds[i]);
            assertEq(gateways[i].token().totalSupply(), spokeOutstanding);
            outstanding += spokeOutstanding;
        }
        assertEq(hts.totalSupply(asset) + outstanding, issued);
    }
}
