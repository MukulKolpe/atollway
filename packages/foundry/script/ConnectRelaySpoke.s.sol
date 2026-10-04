//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { CcipRelay } from "../contracts/transports/CcipRelay.sol";
import { CcipConfig } from "./CcipConfig.sol";

/**
 * @notice Registers a spoke's CCIP adapter on the relay, so the relay forwards messages to and from it.
 *      RELAY=0x... SPOKE_CHAIN_ID=46630 SPOKE_TRANSPORT=0x... yarn deploy --network base_sepolia --file ConnectRelaySpoke.s.sol
 */
contract ConnectRelaySpoke is Script {
    function run() external {
        uint64 spokeId = uint64(vm.envUint("SPOKE_CHAIN_ID"));
        vm.startBroadcast();
        CcipRelay(payable(vm.envAddress("RELAY")))
            .setRoute(
                spokeId, CcipConfig.chain(spokeId).selector, vm.envAddress("SPOKE_TRANSPORT"), CcipConfig.SPOKE_GAS
            );
        vm.stopBroadcast();
    }
}
