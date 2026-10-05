import { formatUnits } from "viem";

/** Bridge fees can rise between quoting and sending. The hub and the spokes refund what is not used. */
const FEE_MARGIN_BPS = 11_000n;

export function withMargin(fee: bigint) {
  return (fee * FEE_MARGIN_BPS) / 10_000n + 1n;
}

/**
 * The hub quotes in tinybars (8 decimals), because that is `msg.value` inside the Hedera EVM. Wallets and the
 * JSON-RPC relay use 18 decimals, so a quote is scaled up before it is sent as a transaction value.
 */
export function hubFeeValue(tinybars: bigint) {
  return withMargin(tinybars) * 10n ** 10n;
}

/** "3.05 HBAR" from tinybars. */
export function formatHbar(tinybars: bigint | undefined) {
  if (tinybars === undefined) return "…";
  return `${Number(formatUnits(tinybars, 8)).toLocaleString("en-US", { maximumFractionDigits: 3 })} HBAR`;
}
