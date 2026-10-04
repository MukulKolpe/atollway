//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AtollwayHub } from "../contracts/hub/AtollwayHub.sol";
import { AggregatorV3Interface } from "../contracts/oracles/AggregatorV3Interface.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys the Atollway hub, with the deployer as the issuer.
 * @dev The hub needs the Hedera Token Service, so deploy it to Hedera:
 *      yarn deploy --network hedera_testnet
 */
contract DeployScript is ScaffoldETHDeploy {
    /// @notice Chainlink HBAR/USD feeds. https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera
    address internal constant HBAR_USD_TESTNET = 0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a;
    address internal constant HBAR_USD_MAINNET = 0xAF685FB45C12b92b5054ccb9313e135525F9b5d5;

    /// @notice Both feeds update at least once a day. Allow one extra hour.
    uint256 internal constant MAX_PRICE_AGE = 25 hours;

    function run() external ScaffoldEthDeployerRunner {
        AtollwayHub hub = new AtollwayHub(deployer, AggregatorV3Interface(_hbarUsdFeed()), MAX_PRICE_AGE);
        deployments.push(Deployment({ name: "AtollwayHub", addr: address(hub) }));
    }

    function _hbarUsdFeed() internal view returns (address) {
        if (block.chainid == 296) return HBAR_USD_TESTNET;
        if (block.chainid == 295) return HBAR_USD_MAINNET;
        revert("The hub needs Hedera. Deploy with: yarn deploy --network hedera_testnet");
    }
}
