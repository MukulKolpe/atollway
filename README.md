# Atollway

Issue a tokenized asset on Hedera, hold it on other major chains, and keep compliance, pricing and payouts on Hedera.

Atollway is a [Scaffold-HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar) template for tokenized funds, bonds and other real-world assets that live on more than one chain.

> **Status:** in development. The design is complete and the contracts are being built. See the [roadmap](docs/roadmap.md).

## Why Atollway

Tokenized assets are often issued on several chains at once. Each copy then needs its own allowlist, its own payouts and its own pricing, and the copies drift apart. Atollway keeps a single source of truth on Hedera:

- **Compliance follows the token.** Approve, freeze or revoke an investor once on Hedera, and every chain enforces it.
- **One supply.** Shares move between Hedera and other chains without being duplicated, and the amount on each chain is capped.
- **Servicing from one place.** Pricing and payouts run on Hedera, with fixed, low fees and scheduled execution.

## License

[MIT](LICENSE)
