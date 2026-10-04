# ADR-0008: Prepay Axelar gas with a fee set per route

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Every Axelar message prepays the gas for its execution on the destination chain, in the source chain's native token, through Axelar's gas service.

Checked on testnet in October 2026:

- The gas service has an on-chain `estimateGasFee`, but its gas data for Hedera and Base Sepolia is empty and it returns 0.
- Axelar's fee API estimates about 0.13 HBAR per message from Hedera to Base Sepolia, and about 0.00004 ETH from Base Sepolia to Hedera.
- On Hedera, contracts see HBAR in tinybars (8 decimals). Axelar's API and explorer report 18 decimals.

## Decision

- Each `AxelarTransport` stores a fee per route, set by its owner, in the source chain's smallest unit: tinybars on Hedera, wei on Base.
- The defaults are 1 HBAR per message from Hedera and 0.0005 ETH from Base Sepolia, several times Axelar's estimates.
- The adapter prepays the whole fee and names the account that started the transaction (`tx.origin`) as the refund address. Axelar refunds what execution does not use.
- `quote` returns the route's fee, so the hub and spokes charge the caller exactly that.

## Consequences

- Callers pay more up front and get the unused part back from Axelar after the message executes.
- If gas prices rise above the fee, the message waits on Axelar until someone adds gas on Axelarscan. Nothing is lost.
- The issuer reviews fees when gas prices change. Once Axelar fills in its on-chain gas data, the adapter can use `estimateGasFee` without changes to the hub or spokes.
- `tx.origin` is only a refund address, never used for authorization.

## Alternatives considered

- **Axelar's on-chain estimate.** Returns 0 on testnet today.
- **Letting callers pass the fee.** Every app and script would need its own estimate, and a fee set too low strands messages more often.
