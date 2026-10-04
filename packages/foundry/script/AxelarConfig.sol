//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @notice Axelar's contracts and chain names on the networks Atollway runs on.
 * @dev Source: https://github.com/axelarnetwork/axelar-contract-deployments/blob/main/axelar-chains-config/info/testnet.json
 */
library AxelarConfig {
    struct Chain {
        string name; // Axelar's name for the chain
        address gateway;
        address gasService;
    }

    error UnsupportedChain(uint256 chainId);

    function chain(uint256 chainId) internal pure returns (Chain memory) {
        if (chainId == 296) {
            return Chain({
                name: "hedera",
                gateway: 0xe432150cce91c13a887f7D836923d5597adD8E31,
                gasService: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6
            });
        }
        if (chainId == 84_532) {
            return Chain({
                name: "base-sepolia",
                gateway: 0xe432150cce91c13a887f7D836923d5597adD8E31,
                gasService: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6
            });
        }
        revert UnsupportedChain(chainId);
    }
}
