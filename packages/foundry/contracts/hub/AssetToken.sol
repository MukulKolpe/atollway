// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable, Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IHederaTokenService } from "../hedera/IHederaTokenService.sol";
import { HederaTokens } from "../hedera/HederaTokens.sol";

/// @title Asset token
/// @notice Creates the asset as a Hedera Token Service token. This contract is the token's treasury and holds
/// its KYC, freeze, wipe, supply and pause keys, so only the hub's rules can change balances or permissions.
/// @dev The owner is the issuer. See docs/adr/0002-hts-asset-token.md.
abstract contract AssetToken is Ownable2Step, ReentrancyGuard {
    /// @notice How long Hedera extends the token's life on each renewal: 90 days.
    int64 internal constant AUTO_RENEW_PERIOD = 7_776_000;

    /// @notice The asset token, or the zero address until {createAsset} is called.
    address public asset;

    /// @notice The asset token's decimals.
    uint8 public assetDecimals;

    event AssetCreated(address indexed asset, string name, string symbol, uint8 decimals);

    error AssetAlreadyCreated();
    error AssetNotCreated();

    constructor(address issuer) Ownable(issuer) { }

    /// @notice Creates the asset token. Send enough HBAR to cover Hedera's token creation fee (about 1 US
    /// dollar); the unused part is returned.
    function createAsset(string calldata name, string calldata symbol, uint8 decimals, string calldata memo)
        external
        payable
        onlyOwner
        nonReentrant
    {
        if (asset != address(0)) revert AssetAlreadyCreated();

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: HederaTokens.KYC_KEY | HederaTokens.FREEZE_KEY | HederaTokens.WIPE_KEY | HederaTokens.SUPPLY_KEY
                | HederaTokens.PAUSE_KEY,
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });
        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: memo,
            tokenSupplyType: false,
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry({
                second: 0, autoRenewAccount: address(this), autoRenewPeriod: AUTO_RENEW_PERIOD
            })
        });

        uint256 balanceBefore = address(this).balance - msg.value;
        asset = HederaTokens.createFungibleToken(token, decimals, msg.value);
        assetDecimals = decimals;
        emit AssetCreated(asset, name, symbol, decimals);

        // Hedera refunds the part of the fee it did not use to this contract. Return it to the issuer.
        uint256 refund = address(this).balance - balanceBefore;
        if (refund > 0) Address.sendValue(payable(msg.sender), refund);
    }

    function _requireAsset() internal view returns (address token) {
        token = asset;
        if (token == address(0)) revert AssetNotCreated();
    }
}
