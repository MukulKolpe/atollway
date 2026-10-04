# Foundry package

Atollway's Solidity contracts, tests and deploy scripts. The hub contracts are being added in the order shown in the [roadmap](../../docs/roadmap.md).

## Setup

The Solidity libraries are Git submodules in `lib/`. If you cloned without `--recurse-submodules`, run this from the repository root:

```bash
git submodule update --init --recursive
```

## Commands

Run these from the repository root.

| Task | Command |
| --- | --- |
| Compile | `yarn foundry:compile` |
| Test | `yarn foundry:test` |
| Check formatting | `yarn foundry:lint` |
| Format | `yarn foundry:format` |
| Create a deployer keystore | `yarn foundry:account:generate` |
| Import an existing key into a keystore | `yarn foundry:account:import` |
| Show the deployer's address and balance | `yarn foundry:account` |

## Deploying

`yarn foundry:deploy --network hedera_testnet` runs `script/Deploy.s.sol` with a Foundry keystore. The keystore's address must be a Hedera account with an ECDSA key, funded from the [Hedera portal](https://portal.hedera.com/faucet). After deploying, the script writes the contract addresses and ABIs to the Next.js app.
