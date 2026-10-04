# Contributing to Atollway

Thanks for your interest in Atollway. This guide explains how to set up the project, how work is organised, and what a pull request needs before it can be merged.

## Ground rules

- Be respectful. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security issues privately, as described in [SECURITY.md](SECURITY.md). Never open a public issue for them.
- Never commit private keys, seed phrases, API keys or `.env` files.

## Prerequisites

- [Node.js](https://nodejs.org) 20.18.3 or later. The repository pins Node 22 in `.nvmrc`, so `nvm use` selects it.
- [Yarn](https://yarnpkg.com). Any global Yarn works; the repository ships its own Yarn release in `.yarn/releases`.
- [Foundry](https://getfoundry.sh) for the Solidity contracts.
- Git.

## Setup

```bash
git clone --recurse-submodules https://github.com/MukulKolpe/atollway.git
cd atollway
yarn install
```

If you cloned without `--recurse-submodules`, run `git submodule update --init --recursive`.

## Everyday commands

| Task | Command |
| --- | --- |
| Lint everything | `yarn lint` |
| Format everything | `yarn format` |
| Type-check the frontend | `yarn next:check-types` |
| Build the frontend | `yarn next:build` |
| Compile contracts | `yarn foundry:compile` |
| Test contracts | `yarn foundry:test` |
| Check the contracts against Hedera testnet and Base Sepolia | `yarn foundry:simulate` |
| Run the frontend locally | `yarn next:dev` |

## How work is organised

1. **Start from an issue.** Every change is tracked by an issue created with one of the issue forms. Comment on the issue before starting so work is not duplicated.
2. **Create a branch** named `<type>/<short-description>`, for example `feat/spoke-registry` or `docs/quickstart`.
3. **Commit using [Conventional Commits](https://www.conventionalcommits.org).** Keep commits small and focused.
4. **Open a pull request** using the template, and link the issue with `Closes #<number>`.
5. **Wait for CI to pass** and for a review. Pull requests are squash-merged, so the pull request title becomes the commit message on `main`.

### Commit types

| Type | Use for |
| --- | --- |
| `feat` | New functionality |
| `fix` | Bug fixes |
| `docs` | Documentation only |
| `refactor` | Code changes that do not change behaviour |
| `test` | Adding or fixing tests |
| `ci` | GitHub Actions and automation |
| `build` | Dependencies, toolchain and build configuration |
| `chore` | Repository maintenance |

Common scopes are `hub`, `spoke`, `transport`, `web`, `scripts`, `template` and `github`, for example `feat(spoke): add compliance check on transfer`.

## Code standards

- **Solidity:** format with `forge fmt`, document public and external functions with NatSpec, and add Foundry tests for new behaviour.
- **TypeScript:** the frontend must pass ESLint with no warnings and the TypeScript type-check.
- **Docs:** update the README, `AGENTS.md` or `docs/` in the same pull request when behaviour changes. Keep writing short and concrete.

## Proposing a new chain

Use the **Spoke chain request** issue form. It asks for the information needed to confirm that the chain can be reached from Hedera through Axelar or Chainlink CCIP.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
