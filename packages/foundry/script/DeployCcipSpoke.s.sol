//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { SpokeGateway } from "../contracts/spoke/SpokeGateway.sol";
import { IRouterClient } from "../contracts/transports/ccip/IRouterClient.sol";
import { CcipTransport } from "../contracts/transports/CcipTransport.sol";
import { CcipConfig } from "./CcipConfig.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys a spoke and its Chainlink CCIP adapter. The adapter reaches the hub directly, or through the
 *      relay on Base Sepolia when RELAY is set, for chains with no CCIP lane to Hedera.
 *      HUB_CCIP_TRANSPORT=0x... yarn deploy --network arbitrum_sepolia --file DeployCcipSpoke.s.sol
 *      RELAY=0x... yarn deploy --network robinhood_testnet --file DeployCcipSpoke.s.sol
 * @dev Optional: ASSET_NAME, ASSET_SYMBOL and ASSET_DECIMALS (default to the testnet demo asset), and GUARDIAN
 *      (defaults to the deployer).
 */
contract DeployCcipSpoke is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        SpokeGateway gateway = new SpokeGateway(
            deployer,
            CcipConfig.HEDERA_TESTNET,
            vm.envOr("ASSET_NAME", string("Atollway Demo Fund")),
            vm.envOr("ASSET_SYMBOL", string("ATLD")),
            uint8(vm.envOr("ASSET_DECIMALS", uint256(6)))
        );
        CcipTransport transport = new CcipTransport(
            IRouterClient(CcipConfig.chain(block.chainid).router), gateway, uint64(block.chainid), deployer
        );

        address relay = vm.envOr("RELAY", address(0));
        if (relay == address(0)) {
            transport.setRoute(
                CcipConfig.HEDERA_TESTNET,
                CcipConfig.chain(CcipConfig.HEDERA_TESTNET).selector,
                vm.envAddress("HUB_CCIP_TRANSPORT"),
                CcipConfig.HUB_GAS
            );
        } else {
            transport.setRoute(
                CcipConfig.HEDERA_TESTNET,
                CcipConfig.chain(CcipConfig.BASE_SEPOLIA).selector,
                relay,
                CcipConfig.RELAY_GAS
            );
        }
        gateway.setTransport(transport);
        address guardian = vm.envOr("GUARDIAN", deployer);
        if (guardian != deployer) gateway.setGuardian(guardian);

        deployments.push(Deployment({ name: "SpokeGateway", addr: address(gateway) }));
        deployments.push(Deployment({ name: "CcipTransport", addr: address(transport) }));
    }
}
