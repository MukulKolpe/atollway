# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Issue forms for tasks, bug reports, feature requests, documentation and spoke chain requests, and a pull request template.
- EditorConfig, a root .gitignore and a pinned Node.js version.
- Foundry and Next.js monorepo based on the Scaffold-HBAR `blank` template ([`b2a23f5`](https://github.com/hedera-dev/scaffold-hbar/tree/b2a23f5ff274200174a9d0a4e23b1968663d6ba8)), with Solidity libraries pinned as submodules.
- Pre-commit hook with Husky and lint-staged.
- Agent briefing (AGENTS.md) and agent skills from the Scaffold-HBAR template.
- Contributing guide, code of conduct, security policy and code owners.
- This changelog.
- CI: frontend lint, type-check and build.
- CI: contract formatting, size check, build and tests.
- Dependabot updates for GitHub Actions.
- Dependabot updates for npm packages.
- `template.json` manifest for create-scaffold-hbar (Foundry, Next.js, Yarn).

### Security

- Removed the Alchemy API key and the Anvil private key bundled with the upstream template.
