# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A `/docs` page in the app, written as a tokenization starter: setup from the scaffold command, where to go next, the building blocks, the life of a token, what is inside the template, and ideas to build on it.
- Template highlights on the overview: the command that scaffolds it, what comes with it, and ideas to build.
- Issuer console: create the asset on a newly deployed hub.

### Changed

- Larger type and higher-contrast secondary text across the app, and a larger header and footer with links to the source and the author.

## [0.1.0] - 2026-10-05

### Added

- `AGENTS.md`, a guide for AI coding agents, with a `CLAUDE.md` pointer.
- Dependabot for npm packages and GitHub Actions.
- Issue forms for tasks, bug reports, feature requests, documentation and spoke chain requests, and a pull request template.
- EditorConfig, a root .gitignore and a pinned Node.js version.
- Foundry and Next.js monorepo based on the Scaffold-HBAR `blank` template ([`b2a23f5`](https://github.com/hedera-dev/scaffold-hbar/tree/b2a23f5ff274200174a9d0a4e23b1968663d6ba8)), with Solidity libraries pinned as submodules.
- Pre-commit hook with Husky and lint-staged.
- Contributing guide, code of conduct, security policy and code owners.
- This changelog.
- CI: frontend lint, type-check and build.
- CI: contract formatting, size check, build and tests.
- `template.json` manifest for create-scaffold-hbar (Foundry, Next.js, Yarn).
- Next steps printed after scaffolding.
- Chain coverage: routes from Hedera to the top chains, with testnet bridge addresses.
- Roadmap.
- Architecture decision records in `docs/adr`.
- Architecture document: components, message flows, trust model and failure modes.
- A Foundry mock of the Hedera Token Service that returns Hedera's response codes.
- Solidity helpers that call the Hedera Token Service and revert with Hedera's response code on failure.
- Hub: creates the asset as an HTS token, with the hub as treasury and holder of its KYC, freeze, wipe, supply and pause keys.
- Hub: investor register to approve, freeze, unfreeze and revoke investors.
- Hub: HBAR/USD pricing with the Chainlink feed and a maximum price age, and a NAV set by the issuer.
- Hub: subscriptions in HBAR at the NAV, with slippage protection.
- Cross-chain message envelope for compliance, mint, release and pause messages.
- Transport adapter interface, so Axelar and Chainlink CCIP adapters are interchangeable.
- Hub: spoke registry with transport adapters and supply caps.
- Hub: send shares to a spoke and release shares returned from one.
- `AtollwayHub`, which combines the hub modules and sends compliance changes and pauses to every spoke.
- `yarn foundry:simulate`: runs the hub against Hedera testnet in mirror node simulations, without spending HBAR.
- Deploy script for the hub on Hedera testnet and mainnet.
- Hub deployed to Hedera testnet ([deployments](docs/deployments.md)).
- Spoke gateway and spoke token: the asset's mirror on other chains, with the hub's compliance rules, its pause, and a local guardian.
- Axelar transport adapter, with gas prepaid at a fee set per route ([ADR-0008](docs/adr/0008-axelar-fees.md)).
- End-to-end tests of the hub and a spoke over Axelar. `yarn foundry:simulate` also checks both Axelar adapters against Axelar's real contracts on Hedera testnet and Base Sepolia.
- Scripts to deploy a spoke on Base Sepolia and connect it to the hub over Axelar.
- First spoke deployed to Base Sepolia and connected to the hub over Axelar ([deployments](docs/deployments.md)).
- Chainlink CCIP transport adapter, paying the router's quoted fee in the native token.
- CCIP relay on Base Sepolia for chains with no CCIP lane to Hedera ([ADR-0009](docs/adr/0009-ccip-relay.md)).
- A test of one hub with three spokes over two bridges. `yarn foundry:simulate` also checks the CCIP adapter and the relay against Chainlink's real routers on Hedera testnet, Base Sepolia, Arbitrum Sepolia and Robinhood Chain testnet.
- Scripts to deploy spokes over Chainlink CCIP, directly or through the relay, and to connect them to the hub.
- Spokes on Arbitrum Sepolia over Chainlink CCIP and on Robinhood Chain testnet through the CCIP relay ([deployments](docs/deployments.md)).
- Network overview in the app: a live map of the hub and its spokes, total supply split by chain, the NAV, the Chainlink HBAR price and the hub's latest events.
- Investor portal: guided setup, subscriptions in HBAR with slippage protection, and holdings on every chain.
- Moving shares between Hedera and the spokes from the app, with a timeline for each transfer from Chainlink's CCIP API, Axelarscan and on-chain arrival checks.
- Issuer console: investors waiting for approval, decisions with their status on every spoke, spoke caps and resending approvals, the NAV, price freshness, proceeds and the pause switch.
- App documentation: pages, data sources, configuration and adding a spoke ([docs/app.md](docs/app.md)).

### Changed

- The repository is public and the template can be scaffolded with `npm create scaffold-hbar@latest`.
- Pull requests are merged with merge commits.
- README rewritten for Atollway.
- Contracts compile with the Solidity optimizer (200 runs).
- The Foundry package README documents the hub contracts, testing and deployment.
- The app uses shadcn/ui on Tailwind CSS instead of daisyUI, with light and dark themes, and works with Hedera testnet, Base Sepolia, Arbitrum Sepolia and Robinhood Chain testnet.

### Removed

- The upstream template's example contracts (`HederaToken`, `HtsTokenCreator`) and their deploy scripts.
- The upstream app's block explorer, burner wallet and local Hedera fork network, which only worked against a local chain.

### Fixed

- The root `.gitignore` ignores `.env`, so a root environment file cannot be committed by mistake.
- Shell commands in the READMEs no longer contain comments, which zsh passes to the command when pasted.

### Security

- Removed the Alchemy API key and the Anvil private key bundled with the upstream template.
