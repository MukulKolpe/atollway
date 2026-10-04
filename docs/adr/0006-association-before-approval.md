# ADR-0006: Require token association before approving an investor

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

[ADR-0002](0002-hts-asset-token.md) planned to deliver shares with HIP-904 airdrops, so investors would not have to associate with the asset token themselves.

Testing against Hedera testnet showed this cannot work for a token with a KYC key:

- Hedera grants KYC only to accounts already associated with the token. `grantTokenKyc` on any other account returns `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` (184).
- An account without KYC cannot receive the token, so an airdrop to a new investor can never complete.

## Decision

- An investor associates their account with the asset token before the issuer approves them. A wallet does this with one call to the token's `associate()` function (HIP-719).
- The hub delivers shares with an ordinary HTS transfer.
- This record replaces the HIP-904 delivery described in ADR-0002. The rest of ADR-0002 stands.

## Consequences

- Onboarding has one step for the investor, done once, before approval. The app will offer it as a button.
- Approving an account that has not associated fails immediately with `HederaCallFailed(grantTokenKyc, 184)`, so the issuer sees the problem at once.
- HIP-904 airdrops remain the right tool for payouts in other tokens, such as USDC, which investors may not have associated. They are planned for payouts.

## Alternatives considered

- **Rely on automatic association.** Hedera can associate an account when it first receives a token, but the transfer still needs KYC, and KYC needs association.
- **Drop the KYC key and enforce approval in Solidity only.** Simpler onboarding, but gives up network-enforced compliance, the main reason for [ADR-0002](0002-hts-asset-token.md).
