//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { AtollwayHub } from "../contracts/hub/AtollwayHub.sol";
import { AxelarTransport } from "../contracts/transports/AxelarTransport.sol";
import { AxelarConfig } from "./AxelarConfig.sol";

/**
 * @notice Connects a deployed spoke to the hub on Hedera: points the hub's Axelar adapter at the spoke's
 *      adapter and registers the spoke with its cap. Run it as the issuer.
 *      HUB=0x... HUB_TRANSPORT=0x... SPOKE_TRANSPORT=0x... yarn deploy --network hedera_testnet --file ConnectSpoke.s.sol
 * @dev Optional: SPOKE_CHAIN_ID (default Base Sepolia), SPOKE_CAP in the asset's smallest unit (default
 *      1,000,000 shares of 6 decimals) and SPOKE_FEE, the gas prepaid per message to the spoke in tinybars.
 */
contract ConnectSpoke is Script {
    /// @notice Prepaid gas per message to the spoke: 1 HBAR. Axelar estimated about 0.13 HBAR in October 2026;
    /// the headroom covers price swings, and Axelar refunds what is not used.
    uint256 internal constant DEFAULT_SPOKE_FEE = 1e8;

    function run() external {
        uint64 spokeId = uint64(vm.envOr("SPOKE_CHAIN_ID", uint256(84_532)));
        AtollwayHub hub = AtollwayHub(vm.envAddress("HUB"));
        AxelarTransport hubTransport = AxelarTransport(vm.envAddress("HUB_TRANSPORT"));

        vm.startBroadcast();
        hubTransport.setRoute(
            spokeId,
            AxelarConfig.chain(spokeId).name,
            vm.envAddress("SPOKE_TRANSPORT"),
            vm.envOr("SPOKE_FEE", DEFAULT_SPOKE_FEE)
        );
        hub.addSpoke(spokeId, hubTransport, vm.envOr("SPOKE_CAP", uint256(1_000_000e6)));
        vm.stopBroadcast();
    }
}
