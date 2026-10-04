# Architecture decision records

Short records of the decisions that shape Atollway: the context, the decision and its consequences. An accepted record is never rewritten. To change a decision, add a new record that supersedes it.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-hedera-as-the-hub.md) | Use Hedera as the hub for issuance and servicing | Accepted |
| [0002](0002-hts-asset-token.md) | Issue the asset as a Hedera Token Service token | Accepted |

## Adding a record

1. Copy [`0000-template.md`](0000-template.md) to the next free number, for example `0007-use-x-for-y.md`.
2. Fill in the context, decision, consequences and alternatives. Keep it to about a page.
3. Add it to the table above and open a pull request. The record is **Proposed** while the pull request is open and **Accepted** once it merges.
4. To change an accepted decision, write a new record and set the old record's status to **Superseded by ADR-XXXX**.
