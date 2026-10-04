//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IRouterClient } from "../contracts/transports/ccip/IRouterClient.sol";
import { CcipRelay } from "../contracts/transports/CcipRelay.sol";
import { CcipConfig } from "./CcipConfig.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys the CCIP relay on Base Sepolia and registers the hub's CCIP adapter as an endpoint. Fund the
 *      relay afterwards: it pays the second hop of every message it forwards.
 *      HUB_CCIP_TRANSPORT=0x... yarn deploy --network base_sepolia --file DeployCcipRelay.s.sol
 */
contract DeployCcipRelay is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        CcipRelay relay = new CcipRelay(IRouterClient(CcipConfig.chain(block.chainid).router), deployer);
        relay.setRoute(
            CcipConfig.HEDERA_TESTNET,
            CcipConfig.chain(CcipConfig.HEDERA_TESTNET).selector,
            vm.envAddress("HUB_CCIP_TRANSPORT"),
            CcipConfig.HUB_GAS
        );
        deployments.push(Deployment({ name: "CcipRelay", addr: address(relay) }));
    }
}
