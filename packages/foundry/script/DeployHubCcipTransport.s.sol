//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IMessageReceiver } from "../contracts/messaging/ITransport.sol";
import { IRouterClient } from "../contracts/transports/ccip/IRouterClient.sol";
import { CcipTransport } from "../contracts/transports/CcipTransport.sol";
import { CcipConfig } from "./CcipConfig.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys the hub's Chainlink CCIP adapter on Hedera. Set HUB to the hub's address.
 *      HUB=0x... yarn deploy --network hedera_testnet --file DeployHubCcipTransport.s.sol
 */
contract DeployHubCcipTransport is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        CcipTransport transport = new CcipTransport(
            IRouterClient(CcipConfig.chain(block.chainid).router),
            IMessageReceiver(vm.envAddress("HUB")),
            uint64(block.chainid),
            deployer
        );
        deployments.push(Deployment({ name: "CcipTransport", addr: address(transport) }));
    }
}
