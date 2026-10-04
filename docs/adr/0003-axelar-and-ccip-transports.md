# ADR-0003: Connect chains through Axelar and Chainlink CCIP

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The hub sends messages to spokes and receives messages back. Atollway has to reach the chains where tokenized assets are held, including Robinhood Chain and Canton, and it should not depend on a single bridge.

Coverage checked in October 2026 (details in [chain coverage](../chains.md)):

- **Axelar** connects Hedera testnet to most major EVM chains, to Solana, Sui, Stellar and XRPL, and directly to Robinhood Chain testnet.
- **Chainlink CCIP** connects Hedera to Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche and Solana. It reaches more chains, including Canton, through one hop via Base.

## Decision

- Messages go through a small transport interface, with one adapter per bridge.
- Axelar General Message Passing is the default adapter. Chainlink CCIP is the second.
- Each spoke is bound to exactly one adapter. A message is accepted only from the adapter, source chain and source address registered for that spoke.
- LayerZero is not used.

## Consequences

- Supporting another bridge means writing an adapter, not changing hub or spoke logic. Hashgraph's CLPR protocol can be added the same way once it is available on Hedera.
- A compromised bridge can only affect the spokes bound to it, and only up to their supply caps (ADR-0005).
- There are two fee models. Axelar charges gas in the source chain's native token through its gas service. CCIP charges in LINK or the native token.
- Chains without a direct CCIP lane to Hedera are reached through a relay contract on Base, which adds a second hop and a second fee.

## Alternatives considered

- **LayerZero.** Wide coverage, but Axelar and CCIP together already reach every target chain, and the project prefers to depend on these two.
- **A single bridge.** Simpler, but one point of failure and narrower coverage.
