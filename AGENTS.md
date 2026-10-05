# AGENTS.md

Guidance for AI coding agents working in this repository. People should start with the [README](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## What Atollway is

A [Scaffold-HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar) template for a tokenized asset that is issued on Hedera and held on other chains:

- **Hub (Hedera).** Issues the asset as a Hedera Token Service (HTS) token with KYC, freeze, wipe, supply and pause keys held by the hub contract. Keeps the investor register, sells shares for HBAR at the issuer's NAV priced with Chainlink HBAR/USD, and keeps a ledger of what each spoke holds, within a cap.
- **Spokes (other chains).** An ERC-20 mirror token and a gateway that applies the hub's compliance decisions, mints incoming transfers and burns outgoing ones.
- **Transports.** Axelar and Chainlink CCIP adapters behind one interface, plus a CCIP relay on Base Sepolia for chains with no CCIP lane to Hedera.
- **App.** A Next.js app with an overview, an investor portal and an issuer console.

Live on testnet: the hub on Hedera, and spokes on Base Sepolia (Axelar), Arbitrum Sepolia (CCIP) and Robinhood Chain testnet (CCIP through the relay). Addresses are in [docs/deployments.md](docs/deployments.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/foundry/contracts/hub` | `AtollwayHub` and its modules: asset token, investor register, subscriptions, spoke registry, supply ledger |
| `packages/foundry/contracts/spoke` | `SpokeGateway` and `SpokeToken` |
| `packages/foundry/contracts/transports` | `AxelarTransport`, `CcipTransport`, `CcipRelay` and the bridges' interfaces |
| `packages/foundry/contracts/messaging` | The message envelope (`Messages.sol`) and the transport interface (`ITransport.sol`) |
| `packages/foundry/contracts/hedera` | HTS interface, response codes, and helpers that revert with Hedera's response code |
| `packages/foundry/script` | Deploy and connect scripts for the hub, spokes, transports and relay |
| `packages/foundry/test` | Unit, integration, fork and simulation tests, and mocks of HTS, Axelar and CCIP |
| `packages/nextjs/app` | Pages: `/` overview, `/invest`, `/issuer`, `/debug` |
| `packages/nextjs/components/atollway` | The app's components; `components/ui` holds the shadcn/ui components |
| `packages/nextjs/hooks/atollway`, `utils/atollway` | Data hooks, contract bindings, mirror node and bridge API clients |
| `packages/nextjs/atollway.config.ts` | Chain names, colours, faucets and spoke routes |
| `docs` | Architecture, decision records, chain coverage, deployments, roadmap and the app |

## Commands

Run from the repository root with Node 22 (`nvm use`) and Yarn.

| Task | Command |
| --- | --- |
| Install | `yarn install` |
| Contract tests | `yarn foundry:test` |
| Check against Hedera testnet and the spoke testnets, without spending | `yarn foundry:simulate` |
| Lint everything | `yarn lint` |
| Type-check the app | `yarn next:check-types` |
| Build the app | `yarn next:build` |
| Run the app | `yarn next:dev` |
| Deploy a script | `yarn foundry:deploy --network <network> --file <Script.s.sol> --keystore <name>` |

Before finishing a change, run `yarn lint`, `yarn next:check-types`, `yarn foundry:test` and `yarn next:build`.

## Hedera specifics

- Inside the Hedera EVM, `msg.value` is in tinybars (8 decimals). Wallets and the JSON-RPC relay use 18 decimals. The hub quotes bridge fees in tinybars, so the app multiplies them by 10^10 before sending.
- An account must associate with the asset token (HIP-719 `associate()`) before the hub can grant it KYC ([ADR-0006](docs/adr/0006-association-before-approval.md)).
- HTS calls that fail revert with `HederaCallFailed(selector, responseCode)`. Common codes: 184 not associated, 176 no KYC, 165 frozen, 265 paused.
- `hedera-forking` does not emulate KYC, freeze, pause or wipe, so tests use the HTS mock in `test/mocks`. `yarn foundry:simulate` runs the real HTS on testnet through mirror node simulations ([ADR-0007](docs/adr/0007-hts-mock-and-simulation.md)).
- The mirror node is the source for token associations, account IDs and the hub's event history.

## Invariants to preserve

- Total supply equals the HTS supply on Hedera plus the outstanding amount the hub records for every spoke. No spoke can exceed its cap.
- Each transfer ID is applied once, on the hub and on every spoke.
- Spokes ignore compliance messages older than the last sequence they applied for that investor.
- Only the registered transport of a spoke may deliver its messages, and adapters accept messages only from their registered peer on the expected chain.

## Conventions

- Conventional Commits and the pull request template. Pull requests are merged with merge commits.
- Record user-facing changes in `CHANGELOG.md` under **Unreleased**, and design decisions as a new ADR in `docs/adr`.
- Keep the workspace names `@sh/nextjs` and `@sh/foundry`: create-scaffold-hbar rewrites scripts by them.
- Do not edit `packages/nextjs/contracts/deployedContracts.ts` by hand. `yarn foundry:deploy` regenerates it from local broadcasts.
- Add shadcn/ui components with `npx shadcn@latest add <component>` from `packages/nextjs`. Send app transactions through `hooks/atollway/useTransaction`, which switches chain, simulates and reports progress.
- Shell commands in documentation contain no `#` comments, because zsh passes them to the command when pasted.

## Safety

- Never commit `.env` files, private keys or keystores. Deploy with Foundry keystores imported through `yarn foundry:account:import`, and never put a private key in a command, a file or a log.
- The contracts are unaudited. Do not deploy them to mainnet with real assets.
