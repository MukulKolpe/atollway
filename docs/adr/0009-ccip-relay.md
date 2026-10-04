# ADR-0009: Reach chains without a CCIP lane to Hedera through a relay on Base

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

[ADR-0003](0003-axelar-and-ccip-transports.md) planned a relay on Base for chains that Chainlink CCIP connects to Base but not to Hedera.

Checked on testnet in October 2026 with the routers' `isChainSupported`:

- Hedera has CCIP lanes to Base Sepolia and Arbitrum Sepolia, but not to Robinhood Chain testnet.
- Base Sepolia has lanes to Hedera and to Robinhood Chain testnet in both directions. It also reaches Canton.
- A CCIP message cannot carry native tokens, so the second hop cannot be paid with money sent along with the first.

## Decision

- Every CCIP message carries an envelope, `abi.encode(uint64 originId, uint64 destinationId, bytes message)`, whether it goes direct or through the relay.
- `CcipRelay` on Base Sepolia forwards a message only if it came from the registered peer of its origin endpoint, on that endpoint's chain. It sends the message on, unchanged, to the destination's registered peer.
- The relay pays the second hop from its own balance. The issuer owns the relay and keeps it funded. The caller pays the first hop as with any other message.
- CCIP messages allow out-of-order execution. The protocol already tolerates reordering: statuses carry sequence numbers and transfers carry unique IDs.

## Consequences

- Adding a chain that CCIP reaches only through Base takes a spoke deployment and two route registrations, one on the relay and one on the hub's adapter. The hub's code does not change.
- The relay is trusted. Its owner could forge messages for the endpoints behind it, limited by those spokes' caps ([ADR-0005](0005-spoke-supply-caps.md)). In production the owner should be a multisig.
- A relayed message waits for two CCIP hops, each after its source chain's finality, so it is slower than a direct one.
- If the relay's balance runs out, forwarding reverts and CCIP keeps the message. Once the relay is funded, it can be executed again from the CCIP Explorer.

## Alternatives considered

- **Axelar for Robinhood Chain.** Axelar connects Hedera and Robinhood Chain on testnet, but not on mainnet, where CCIP through Base is the route. The relay covers both, and Canton too.
- **A relay that charges the first hop for the second.** The first hop cannot carry native tokens, and paying in LINK or bridged tokens adds a token to every message.
