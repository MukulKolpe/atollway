//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @notice Chainlink CCIP's routers and chain selectors on the networks Atollway runs on, and the gas each kind of
 *      endpoint gets for `ccipReceive`.
 * @dev Source: https://docs.chain.link/ccip/directory/testnet
 */
library CcipConfig {
    struct Chain {
        address router;
        uint64 selector;
    }

    uint64 internal constant HEDERA_TESTNET = 296;
    uint64 internal constant BASE_SEPOLIA = 84_532;

    /// @notice Gas for the hub's `ccipReceive` on Hedera: decoding, minting and transferring through HTS. Axelar
    /// measured about 144,000 for the same release in October 2026.
    uint32 internal constant HUB_GAS = 300_000;

    /// @notice Gas for a spoke's `ccipReceive`: a status change or a mint.
    uint32 internal constant SPOKE_GAS = 200_000;

    /// @notice Gas for the relay's `ccipReceive`, which quotes and sends the second hop.
    uint32 internal constant RELAY_GAS = 300_000;

    error UnsupportedChain(uint256 chainId);

    function chain(uint256 chainId) internal pure returns (Chain memory) {
        if (chainId == HEDERA_TESTNET) {
            return Chain({ router: 0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4, selector: 222_782_988_166_878_823 });
        }
        if (chainId == BASE_SEPOLIA) {
            return Chain({ router: 0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93, selector: 10_344_971_235_874_465_080 });
        }
        if (chainId == 421_614) {
            return Chain({ router: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165, selector: 3_478_487_238_524_512_106 });
        }
        if (chainId == 46_630) {
            return Chain({ router: 0x30D197C6F5bE050D5525dD94d01760FaCdB67e7C, selector: 2_032_988_798_112_970_440 });
        }
        revert UnsupportedChain(chainId);
    }
}
