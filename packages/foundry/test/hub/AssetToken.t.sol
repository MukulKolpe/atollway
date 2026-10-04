// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { HederaTokens } from "../../contracts/hedera/HederaTokens.sol";
import { AssetToken } from "../../contracts/hub/AssetToken.sol";
import { MockHtsToken } from "../mocks/MockHederaTokenService.sol";
import { HederaTest } from "../utils/HederaTest.sol";

contract AssetTokenHarness is AssetToken {
    constructor(address issuer) AssetToken(issuer) { }

    function requireAsset() external view returns (address) {
        return _requireAsset();
    }
}

contract AssetTokenTest is HederaTest {
    AssetTokenHarness internal hub;
    address internal issuer = makeAddr("issuer");

    function setUp() public override {
        super.setUp();
        hub = new AssetTokenHarness(issuer);
        vm.deal(issuer, 100e8);
    }

    function test_createAsset_createsTokenHeldByTheHub() public {
        vm.prank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "demo");

        address token = hub.asset();
        assertEq(MockHtsToken(token).name(), "Atollway Fund");
        assertEq(MockHtsToken(token).symbol(), "ATLF");
        assertEq(MockHtsToken(token).decimals(), 6);
        assertEq(hub.assetDecimals(), 6);
        assertEq(hts.treasuryOf(token), address(hub));
        uint256[5] memory keys = [
            HederaTokens.KYC_KEY,
            HederaTokens.FREEZE_KEY,
            HederaTokens.WIPE_KEY,
            HederaTokens.SUPPLY_KEY,
            HederaTokens.PAUSE_KEY
        ];
        for (uint256 i; i < keys.length; i++) {
            assertEq(hts.keyHolder(token, keys[i]), address(hub));
        }
    }

    function test_createAsset_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit AssetToken.AssetCreated(address(0), "Atollway Fund", "ATLF", 6);
        vm.prank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
    }

    function test_createAsset_refundsUnusedFee() public {
        vm.prank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");

        assertEq(issuer.balance, 100e8 - hts.CREATION_FEE());
        assertEq(address(hub).balance, 0);
    }

    function test_createAsset_onlyOnce() public {
        vm.startPrank(issuer);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
        vm.expectRevert(AssetToken.AssetAlreadyCreated.selector);
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
    }

    function test_createAsset_onlyIssuer() public {
        vm.deal(address(this), CREATION_VALUE);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        hub.createAsset{ value: CREATION_VALUE }("Atollway Fund", "ATLF", 6, "");
    }

    function test_requireAsset_revertsBeforeCreation() public {
        vm.expectRevert(AssetToken.AssetNotCreated.selector);
        hub.requireAsset();
    }
}
