//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { AtollwayHub } from "../contracts/hub/AtollwayHub.sol";
import { CcipTransport } from "../contracts/transports/CcipTransport.sol";
import { CcipConfig } from "./CcipConfig.sol";

/**
 * @notice Connects a deployed CCIP spoke to the hub on Hedera: points the hub's CCIP adapter at the spoke's
 *      adapter, or at the relay when RELAY is set, and registers the spoke with its cap. Run it as the issuer.
 *      HUB=0x... HUB_CCIP_TRANSPORT=0x... SPOKE_CHAIN_ID=421614 SPOKE_TRANSPORT=0x... yarn deploy --network hedera_testnet --file ConnectCcipSpoke.s.sol
 * @dev Optional: SPOKE_CAP in the asset's smallest unit (default 1,000,000 shares of 6 decimals).
 */
contract ConnectCcipSpoke is Script {
    function run() external {
        uint64 spokeId = uint64(vm.envUint("SPOKE_CHAIN_ID"));
        AtollwayHub hub = AtollwayHub(vm.envAddress("HUB"));
        CcipTransport hubTransport = CcipTransport(vm.envAddress("HUB_CCIP_TRANSPORT"));
        address relay = vm.envOr("RELAY", address(0));

        vm.startBroadcast();
        if (relay == address(0)) {
            hubTransport.setRoute(
                spokeId, CcipConfig.chain(spokeId).selector, vm.envAddress("SPOKE_TRANSPORT"), CcipConfig.SPOKE_GAS
            );
        } else {
            hubTransport.setRoute(
                spokeId, CcipConfig.chain(CcipConfig.BASE_SEPOLIA).selector, relay, CcipConfig.RELAY_GAS
            );
        }
        hub.addSpoke(spokeId, hubTransport, vm.envOr("SPOKE_CAP", uint256(1_000_000e6)));
        vm.stopBroadcast();
    }
}
