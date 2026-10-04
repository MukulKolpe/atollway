//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IMessageReceiver } from "../contracts/messaging/ITransport.sol";
import { AxelarTransport } from "../contracts/transports/AxelarTransport.sol";
import { IAxelarGasService } from "../contracts/transports/axelar/IAxelarGasService.sol";
import { IAxelarGateway } from "../contracts/transports/axelar/IAxelarGateway.sol";
import { AxelarConfig } from "./AxelarConfig.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys the hub's Axelar adapter on Hedera. Set HUB to the hub's address.
 *      HUB=0x... yarn deploy --network hedera_testnet --file DeployHubTransport.s.sol
 */
contract DeployHubTransport is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        AxelarConfig.Chain memory axelar = AxelarConfig.chain(block.chainid);
        AxelarTransport transport = new AxelarTransport(
            IAxelarGateway(axelar.gateway),
            IAxelarGasService(axelar.gasService),
            IMessageReceiver(vm.envAddress("HUB")),
            deployer
        );
        deployments.push(Deployment({ name: "AxelarTransport", addr: address(transport) }));
    }
}
