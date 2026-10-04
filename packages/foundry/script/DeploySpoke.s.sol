//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { SpokeGateway } from "../contracts/spoke/SpokeGateway.sol";
import { AxelarTransport } from "../contracts/transports/AxelarTransport.sol";
import { IAxelarGasService } from "../contracts/transports/axelar/IAxelarGasService.sol";
import { IAxelarGateway } from "../contracts/transports/axelar/IAxelarGateway.sol";
import { AxelarConfig } from "./AxelarConfig.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

/**
 * @notice Deploys a spoke and its Axelar adapter, and points the adapter at the hub's adapter on Hedera.
 *      HUB_TRANSPORT=0x... yarn deploy --network base_sepolia --file DeploySpoke.s.sol
 * @dev Optional: ASSET_NAME, ASSET_SYMBOL and ASSET_DECIMALS (default to the testnet demo asset), GUARDIAN
 *      (defaults to the deployer) and HUB_FEE, the gas prepaid per message to Hedera in wei.
 */
contract DeploySpoke is ScaffoldETHDeploy {
    uint64 internal constant HEDERA_TESTNET = 296;

    /// @notice Prepaid gas per message to Hedera. Axelar estimated about 0.00004 ETH in October 2026; the
    /// headroom covers price swings, and Axelar refunds what is not used.
    uint256 internal constant DEFAULT_HUB_FEE = 0.0005 ether;

    function run() external ScaffoldEthDeployerRunner {
        AxelarConfig.Chain memory here = AxelarConfig.chain(block.chainid);
        AxelarConfig.Chain memory hub = AxelarConfig.chain(HEDERA_TESTNET);

        SpokeGateway gateway = new SpokeGateway(
            deployer,
            HEDERA_TESTNET,
            vm.envOr("ASSET_NAME", string("Atollway Demo Fund")),
            vm.envOr("ASSET_SYMBOL", string("ATLD")),
            uint8(vm.envOr("ASSET_DECIMALS", uint256(6)))
        );
        AxelarTransport transport =
            new AxelarTransport(IAxelarGateway(here.gateway), IAxelarGasService(here.gasService), gateway, deployer);

        transport.setRoute(
            HEDERA_TESTNET, hub.name, vm.envAddress("HUB_TRANSPORT"), vm.envOr("HUB_FEE", DEFAULT_HUB_FEE)
        );
        gateway.setTransport(transport);
        address guardian = vm.envOr("GUARDIAN", deployer);
        if (guardian != deployer) gateway.setGuardian(guardian);

        deployments.push(Deployment({ name: "SpokeGateway", addr: address(gateway) }));
        deployments.push(Deployment({ name: "AxelarTransport", addr: address(transport) }));
    }
}
