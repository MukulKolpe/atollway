import { formatUnits } from "viem";

/** `0x1234…abcd`, keeping `chars` characters on each side. */
export function shortAddress(address: string, chars = 4) {
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** A token amount with grouping and at most `maxDecimals` decimals. */
export function formatAmount(value: bigint | undefined, decimals: number, maxDecimals = 4) {
  if (value === undefined) return "–";
  const number = Number(formatUnits(value, decimals));
  return number.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

/** US dollars, from a value with `decimals` decimals. */
export function formatUsd(value: bigint | undefined, decimals: number, maxDecimals = 2) {
  if (value === undefined) return "–";
  const number = Number(formatUnits(value, decimals));
  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(2, maxDecimals),
    maximumFractionDigits: maxDecimals,
  });
}

/** "3 min ago", "2 h ago", "4 Oct". */
export function timeAgo(date: Date, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "45 s", "12 min", "1 h 5 min". */
export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
