# ADR-0004: Identify investors by the same EVM address on every chain

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

Compliance decisions are made on Hedera and enforced on every spoke. The hub needs one identifier per investor that means the same thing on all chains.

## Decision

An investor is identified by an EVM address. On Hedera, that address is the EVM alias of an account with an ECDSA (secp256k1) key. The same address holds the asset on every spoke.

## Consequences

- One approval on the hub covers the investor everywhere. The hub sends it to each spoke.
- Investors need a Hedera account with an ECDSA key. Accounts with ED25519 keys have no matching address on other chains and are not supported.
- Wallets such as MetaMask work unchanged on every chain.

## Alternatives considered

- **A different address per chain, linked by the issuer.** Flexible, but doubles onboarding work and invites mistakes.
- **Hedera account IDs (`0.0.x`).** Native to Hedera, but meaningless on other chains.
