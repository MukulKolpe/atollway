# Chain coverage

Where Atollway spokes can run, and how messages reach them from Hedera.

Checked on 2 October 2026 against Axelar's published chain configuration, Chainlink's CCIP directory and on-chain router calls. Bridge support changes over time, so check the [sources](#sources) before deploying.

## Routes from Hedera

The top chains by value locked in DeFi, plus Canton.

| Chain | Spoke code | Testnet route | Mainnet route |
| --- | --- | --- | --- |
| Ethereum | Solidity | Axelar, CCIP | Axelar, CCIP |
| Solana | Rust | Axelar, CCIP | Axelar, CCIP |
| Base | Solidity | Axelar, CCIP | Axelar, CCIP |
| BNB Chain | Solidity | Axelar | Axelar |
| Tron | – | Not reachable | Not reachable |
| Arbitrum | Solidity | Axelar, CCIP | Axelar, CCIP |
| HyperEVM | Solidity | Axelar | Axelar |
| Monad | Solidity | Axelar | Axelar; CCIP via Base relay |
| Robinhood Chain | Solidity | Axelar; CCIP via Base relay | CCIP via Base relay |
| Polygon | Solidity | CCIP | Axelar, CCIP |
| Avalanche | Solidity | Axelar, CCIP | Axelar, CCIP |
| Arc | Solidity | Axelar; CCIP via Base relay | CCIP via Base relay |
| Sui | Move | Axelar | Axelar |
| Plasma | Solidity | CCIP via Base relay | CCIP via Base relay |
| OP Mainnet | Solidity | CCIP | Axelar, CCIP |
| Stellar | Soroban | Axelar | Axelar |
| Canton | Daml | CCIP via Base relay | CCIP via Base relay |

- **Axelar, CCIP:** the bridge connects Hedera and the chain directly.
- **CCIP via Base relay:** Hedera to Base over CCIP, then Base to the chain over CCIP, through Atollway's relay contract on Base.
- **Not reachable:** neither Axelar nor CCIP supports the chain.
- On testnet, the most recent Axelar message to Polygon Amoy failed and OP Sepolia has had no Axelar traffic since August 2026, so those spokes use CCIP.

Chains with **Solidity** spokes share one contract and need only configuration. The others need a spoke written in that chain's language.

## Testnet addresses

| Network | Chain ID | Axelar chain name | Axelar gateway | Axelar gas service |
| --- | --- | --- | --- | --- |
| Hedera testnet | 296 | `hedera` | `0xe432150cce91c13a887f7D836923d5597adD8E31` | `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6` |
| Base Sepolia | 84532 | `base-sepolia` | `0xe432150cce91c13a887f7D836923d5597adD8E31` | `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6` |
| Arbitrum Sepolia | 421614 | `arbitrum-sepolia` | `0xe1cE95479C84e9809269227C7F8524aE051Ae77a` | `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6` |
| Robinhood Chain testnet | 46630 | `robinhood` | `0x2a949565682ad89ca4Ad325499C36d3865a3ee02` | `0xef2e20AE1095C6bDb888e91E3c1a2443CBb76DB9` |

| Network | CCIP router | CCIP chain selector | CCIP fee tokens |
| --- | --- | --- | --- |
| Hedera testnet | `0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4` | `222782988166878823` | LINK, WHBAR, HBAR |
| Base Sepolia | `0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93` | `10344971235874465080` | LINK, WETH, ETH |
| Arbitrum Sepolia | `0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165` | `3478487238524512106` | LINK, WETH, ETH |
| Robinhood Chain testnet | `0x30D197C6F5bE050D5525dD94d01760FaCdB67e7C` | `2032988798112970440` | LINK, WETH, ETH |

## Price feeds on Hedera testnet

| Feed | Address |
| --- | --- |
| Chainlink HBAR / USD | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Chainlink USDC / USD | `0xb632a7e7e02d76c0Ce99d9C62c7a2d1B5F92B6B5` |

## Sources

- [Axelar chain configuration](https://github.com/axelarnetwork/axelar-contract-deployments/tree/main/axelar-chains-config/info)
- [Chainlink CCIP directory](https://docs.chain.link/ccip/directory/testnet)
- [Chainlink data feeds on Hedera](https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera)
- [DefiLlama chain data](https://api.llama.fi/v2/chains), for the ranking by value locked
