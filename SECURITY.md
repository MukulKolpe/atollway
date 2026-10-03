# Security Policy

## Status

Atollway is a template for testnet development. Its contracts have **not been audited**. Do not use it with real funds without an independent security review.

## Supported versions

Only the latest commit on `main` receives security fixes.

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/MukulKolpe/atollway/security/advisories/new). Do not open a public issue.

Include:

- a description of the issue and its impact
- the affected files, contracts or commands
- steps to reproduce, or a proof of concept
- any transaction links (HashScan, block explorer, Axelarscan or CCIP Explorer)

Never include private keys or seed phrases in a report.

You can expect an acknowledgement within 5 business days. Once a fix is ready, the advisory is published with credit to the reporter unless you ask to remain anonymous.

## Scope

In scope: the contracts, scripts, frontend and configuration in this repository.

Out of scope: vulnerabilities in third-party protocols that Atollway integrates with, such as Axelar, Chainlink CCIP, Chainlink Data Feeds or SaucerSwap. Report those to the protocol directly.
