# ADR-0005: Cap the supply each spoke can hold

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

Supply moves between Hedera and the spokes through bridge messages. If a bridge or its validators were compromised, an attacker could forge messages that mint tokens on a spoke or release tokens on Hedera.

## Decision

- The hub records how much of the asset is outstanding on each spoke.
- Sending supply to a spoke burns it on Hedera and adds it to that spoke's outstanding amount. The transfer is rejected if it would push the spoke over its cap.
- Supply returning from a spoke is released on Hedera only up to that spoke's outstanding amount.
- Every transfer carries a unique ID. The hub and each spoke accept a given ID only once.

## Consequences

- Total supply always equals the supply on Hedera plus the outstanding amounts on all spokes.
- A forged message can mint at most the remaining cap of the spokes bound to the compromised bridge, and can release on Hedera at most those spokes' outstanding amounts.
- The issuer chooses each cap and raises it as demand grows.

## Alternatives considered

- **No caps.** Simplest, but a bridge failure could inflate supply without limit.
- **Rate limits per time window.** Complementary to caps, and may be added later.
