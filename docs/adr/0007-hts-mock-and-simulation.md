# ADR-0007: Test the hub with an HTS mock and mirror node simulations

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The hub depends on the Hedera Token Service for KYC, freezing, pausing, minting, wiping and transfers. Foundry cannot run HTS by itself.

[ADR-0002](0002-hts-asset-token.md) planned to test with the [hedera-forking](https://github.com/hashgraph/hedera-forking) library. Version 0.1.2, which the template pins, emulates token creation, minting and transfers, but not KYC, freezing, pausing or wiping.

A Hedera mirror node can simulate a contract call against the real network state, using the real HTS logic, without submitting anything or spending HBAR.

## Decision

- **Unit tests** use `MockHederaTokenService`, a test double installed at `0x167`. It implements only the HTS functions the hub calls, and returns Hedera's response codes for the same situations.
- **`yarn foundry:simulate`** runs the hub against Hedera testnet through mirror node simulations (`POST /api/v1/contracts/call`). Each scenario deploys and drives the hub inside one simulated contract deployment, then checks the outcome.
- The simulation checks the same response codes the mock returns, so a difference between the mock and Hedera shows up as a failed simulation.
- This record replaces the hedera-forking approach described in ADR-0002.

## Consequences

- `forge test` runs anywhere, including CI, with no network access and no Hedera account.
- The simulation needs network access, so it runs by hand, for example before a deployment, and not in CI.
- A mirror node simulation does not undo the storage writes of an inner call that reverts. Each expected failure therefore runs as a separate simulation.
- The mock covers only what the hub uses. Calling a new HTS function means extending the mock and adding a simulation scenario for it.

## Alternatives considered

- **hedera-forking.** No KYC, freeze, pause or wipe in the pinned version.
- **A local Hedera network in Docker.** Runs the real services, but takes much longer to set up than a single HTTP call. Better suited to end-to-end tests of the whole system later.
- **Testing only on testnet.** Real, but every run costs HBAR and needs a funded account.
