# Roadmap

Atollway is built in milestones. Each milestone ends with something that runs, and is tracked by issues on GitHub.

| Milestone | Outcome | Status |
| --- | --- | --- |
| Foundation | Repository, issue forms, CI, the Scaffold-HBAR base and an installable template | Done |
| Design | Decision records, architecture, chain coverage and the README | Done |
| Hub | HTS asset token, investor register, subscriptions priced with Chainlink, spoke registry and supply ledger, deployed to Hedera testnet | Done |
| First spoke | Spoke token and gateway on Base Sepolia over Axelar: compliance sync and transfers in both directions | Done |
| More spokes | CCIP adapter, the Base relay, and spokes on Arbitrum Sepolia and Robinhood Chain testnet | Done |
| App | Issuer console, investor portal and cross-chain transfer status in the Next.js app | Done |
| Payouts | Scheduled distributions to holders on every chain, run by the Hedera Schedule Service | Planned |
| Release | Final documentation, agent guide, testnet evidence and public release | Planned |

## Later

- A Canton spoke written in Daml, reached through the Base relay.
- Solana, Sui and Stellar spokes.
- Hashgraph's CLPR as a third transport, once it is available on Hedera.
- Mainnet configuration.
