# Architecture decision records

Short records of the decisions that shape Atollway: the context, the decision and its consequences. An accepted record is never rewritten. To change a decision, add a new record that supersedes it.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-hedera-as-the-hub.md) | Use Hedera as the hub for issuance and servicing | Accepted |
| [0002](0002-hts-asset-token.md) | Issue the asset as a Hedera Token Service token | Accepted |
| [0003](0003-axelar-and-ccip-transports.md) | Connect chains through Axelar and Chainlink CCIP | Accepted |
| [0004](0004-evm-address-identity.md) | Identify investors by the same EVM address on every chain | Accepted |
| [0005](0005-spoke-supply-caps.md) | Cap the supply each spoke can hold | Accepted |
| [0006](0006-association-before-approval.md) | Require token association before approving an investor | Accepted |
| [0007](0007-hts-mock-and-simulation.md) | Test the hub with an HTS mock and mirror node simulations | Accepted |
| [0008](0008-axelar-fees.md) | Prepay Axelar gas with a fee set per route | Accepted |

## Adding a record

1. Copy [`0000-template.md`](0000-template.md) to the next free number, for example `0009-use-x-for-y.md`.
2. Fill in the context, decision, consequences and alternatives. Keep it to about a page.
3. Add it to the table above and open a pull request. The record is **Proposed** while the pull request is open and **Accepted** once it merges.
4. To change an accepted decision, write a new record and set the old record's status to **Superseded by ADR-XXXX**. If the new record changes only part of the old one, set the old record's status to **Accepted, amended by ADR-XXXX** instead.
