# ADR-0002: Issue the asset as a Hedera Token Service token

- **Status:** Accepted, amended by [ADR-0006](0006-association-before-approval.md) and [ADR-0007](0007-hts-mock-and-simulation.md)
- **Date:** 2026-10-04

## Context

A regulated asset needs per-investor approval, freezing, pausing and, in some cases, the ability to recover tokens. On EVM chains these controls are written in contract code. On Hedera they can be native features of the token itself.

## Decision

The asset is a fungible Hedera Token Service (HTS) token, created by the hub contract through the HTS system contract at `0x167`. The hub contract holds the token's KYC, freeze, pause, wipe and supply keys, and is its treasury.

## Consequences

- On Hedera, only accounts the hub has granted KYC can send or receive the token. The network enforces this, not Atollway's code.
- The token appears natively in Hedera wallets, on HashScan and in the mirror node.
- Creating the token from a contract costs HBAR, sent with the creation call.
- An account must be associated with a token before it can hold it. Atollway delivers shares with HIP-904 airdrops, so investors do not have to associate manually.
- Foundry cannot execute the HTS system contract by itself. Contract tests use the [hedera-forking](https://github.com/hashgraph/hedera-forking) library, which emulates HTS in Foundry.
- Other chains cannot hold an HTS token, so each spoke holds an ERC-20 mirror instead (see [the architecture document](../architecture.md)).

## Alternatives considered

- **An ERC-20 on Hedera with compliance written in Solidity.** Portable, but loses network-enforced controls and native wallet support.
- **Hedera's Asset Tokenization Studio (ERC-1400 / ERC-3643).** Feature-rich, but designed for single-chain securities and much heavier than a template should be.
