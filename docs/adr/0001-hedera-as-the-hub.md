# ADR-0001: Use Hedera as the hub for issuance and servicing

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

Tokenized funds, bonds and stocks are increasingly held on several chains at once. Each copy is usually run on its own, with a separate allowlist, separate dividend handling and separate pricing. Compliance and servicing fragment, and the asset cannot move between the chains where it is held.

Atollway needs one place where the asset is issued, where the issuer decides who may hold it, and from which every holder is serviced, while holders can sit on other chains.

## Decision

The asset is issued on Hedera. Hedera is the single source of truth for:

- the investor register: who is approved, frozen or revoked
- the total supply, including how much of it currently sits on each other chain
- the price of subscriptions
- scheduled servicing such as payouts

Other chains are **spokes**. A spoke holds a mirror of the asset that only the hub can mint, and it enforces the compliance decisions the hub sends it.

## Consequences

- Compliance controls are enforced by the network itself, because the asset is a Hedera Token Service token (ADR-0002).
- Hedera's fees are fixed and low in US dollars, so servicing many holders stays affordable.
- The Hedera Schedule Service can run record dates and payouts without an off-chain keeper.
- The mirror node reports holder balances at any past time, which payouts need.
- Every change a spoke makes to supply or compliance arrives as a cross-chain message, so spokes see hub decisions after a delay of minutes. The trust model in [the architecture document](../architecture.md) covers what this means.
- Pausing the hub stops the whole system. This is intended: the issuer must be able to halt everything.

## Alternatives considered

- **Issue natively on every chain and reconcile off-chain.** Simple per chain, but supply, compliance and payouts have no single source of truth.
- **Use another chain as the hub.** Possible, but Hedera's native token controls, fixed fees, scheduled execution and mirror node history are what servicing needs.
