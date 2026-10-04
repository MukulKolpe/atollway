# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Changed

- README rewritten for Atollway.
- Contracts compile with the Solidity optimizer (200 runs).
- The Foundry package README documents the hub contracts, testing and deployment.

### Removed

- The upstream template's example contracts (`HederaToken`, `HtsTokenCreator`) and their deploy scripts.

### Fixed

- The root `.gitignore` ignores `.env`, so a root environment file cannot be committed by mistake.
- Shell commands in the READMEs no longer contain comments, which zsh passes to the command when pasted.

### Security

- Removed the Alchemy API key and the Anvil private key bundled with the upstream template.
