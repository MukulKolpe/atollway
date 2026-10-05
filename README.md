# Atollway

[![CI](https://github.com/MukulKolpe/atollway/actions/workflows/ci.yml/badge.svg)](https://github.com/MukulKolpe/atollway/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Hedera testnet](https://img.shields.io/badge/Hedera-testnet-8259ef.svg)](docs/deployments.md)

Issue a tokenized asset on Hedera, hold it on other major chains, and keep compliance, pricing and payouts on Hedera.

Atollway is a [Scaffold-HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar) template for tokenized funds, bonds and other real-world assets that live on more than one chain.

> **Status:** first release, on testnet. The Hedera hub and three spokes are running on testnet ([deployments](docs/deployments.md)): Base Sepolia over Axelar, Arbitrum Sepolia over Chainlink CCIP, and Robinhood Chain over CCIP through a relay on Base. The app serves investors and the issuer on every chain. Scheduled payouts are next. See the [roadmap](docs/roadmap.md).

## Why Atollway

Tokenized assets are often issued on several chains at once. Each copy then needs its own allowlist, its own payouts and its own pricing, and the copies drift apart. Atollway keeps a single source of truth on Hedera:

- **Compliance follows the token.** Approve, freeze or revoke an investor once on Hedera, and every chain enforces it.
- **One supply.** Shares move between Hedera and other chains without being duplicated, and the amount on each chain is capped.
- **Servicing from one place.** Pricing and payouts run on Hedera, with fixed, low fees and scheduled execution.

## How it works

```mermaid
flowchart LR
  hub["Hedera hub<br/>HTS asset · investor register · pricing"]
  hub <-->|Axelar| a["Base"]
  hub <-->|CCIP via Base| b["Robinhood Chain"]
  hub <-->|Chainlink CCIP| c["Arbitrum"]
  hub <-->|CCIP via Base| d["Canton"]
```

1. The issuer creates the asset on Hedera as a Hedera Token Service token, with network-enforced KYC, freeze and pause controls.
2. Approved investors subscribe with HBAR at the issuer's net asset value, priced with the Chainlink HBAR/USD feed.
3. Investors move shares to another chain. The hub burns them on Hedera and the spoke on that chain mints a mirror token at the same address.
4. Every compliance decision made on Hedera is sent to every spoke over Axelar or Chainlink CCIP, so the rules are the same everywhere.

The [architecture document](docs/architecture.md) covers the components, message flows, trust model and failure modes. [Chain coverage](docs/chains.md) lists the chains a spoke can run on, and the [decision records](docs/adr/README.md) explain why the design looks the way it does.

## The app

![The Atollway overview: a live map of the Hedera hub and its spokes, with supply, NAV and HBAR price](docs/images/overview.png)

- **Overview** shows the hub and its spokes live: the supply on every chain, the NAV, the Chainlink HBAR price and the latest events.
- **Invest** takes an investor through setup, subscribes with HBAR, and moves shares between chains with a live timeline for each transfer.
- **Issuer** approves, freezes and revokes investors, shows which spokes have applied each decision, and sets caps, the NAV and the pause switch.

[docs/app.md](docs/app.md) explains where the data comes from and how to add a spoke to the app.

## Getting started

Create a project from the template with:

```bash
npm create scaffold-hbar@latest -- --template MukulKolpe/atollway
```

## Development

You need Node.js 22 (`nvm use` picks it from `.nvmrc`), Yarn, [Foundry](https://getfoundry.sh) and Git.

```bash
git clone --recurse-submodules https://github.com/MukulKolpe/atollway.git
cd atollway
yarn install
yarn foundry:test
yarn foundry:simulate
yarn next:dev
```

`yarn foundry:test` runs the contract tests, `yarn foundry:simulate` checks the contracts against Hedera testnet and the spoke testnets without spending anything, and `yarn next:dev` starts the app at http://localhost:3000.

[CONTRIBUTING.md](CONTRIBUTING.md) lists every command and explains how changes are proposed and reviewed.

## Documentation

| Document | What it covers |
| --- | --- |
| [Architecture](docs/architecture.md) | Components, message flows, trust model, failure modes |
| [Decision records](docs/adr/README.md) | Why the design looks the way it does |
| [Chain coverage](docs/chains.md) | Where spokes can run, with testnet bridge addresses |
| [Contracts](packages/foundry/README.md) | The hub contracts, tests, simulation and deployment |
| [App](docs/app.md) | Pages, data sources, configuration and adding a spoke to the app |
| [Roadmap](docs/roadmap.md) | Milestones and their status |
| [Deployments](docs/deployments.md) | Contract addresses and testnet transactions |
| [Changelog](CHANGELOG.md) | What changed, release by release |

## Security

The contracts are unaudited. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
