import { Address } from "viem";
import { useReadContracts } from "wagmi";
import { aggregatorAbi, htsTokenAbi, hub } from "~~/utils/atollway/contracts";

const REFRESH_MS = 15_000;

export type HubState = {
  token?: Address;
  decimals: number;
  symbol: string;
  /** Shares on Hedera, in the token's smallest unit. */
  hederaSupply?: bigint;
  /** US dollars per share, with 8 decimals. */
  nav?: bigint;
  /** The Chainlink HBAR/USD answer, with `priceDecimals` decimals. */
  hbarUsd?: bigint;
  priceDecimals: number;
  priceUpdatedAt?: Date;
  /** Whether the price is too old for subscriptions. */
  priceStale: boolean;
  maxPriceAge?: bigint;
  owner?: Address;
  paused?: boolean;
  spokeIds: readonly bigint[];
};

/**
 * The hub's state on Hedera: the asset, its NAV and HBAR price, and the registered spokes.
 */
export function useHub() {
  const base = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...hub, functionName: "asset" },
      { ...hub, functionName: "assetDecimals" },
      { ...hub, functionName: "nav" },
      { ...hub, functionName: "hbarUsdFeed" },
      { ...hub, functionName: "maxPriceAge" },
      { ...hub, functionName: "owner" },
      { ...hub, functionName: "paused" },
      { ...hub, functionName: "spokeIds" },
    ],
    query: { refetchInterval: REFRESH_MS },
  });

  const [asset, assetDecimals, nav, feed, maxPriceAge, owner, paused, spokeIds] = base.data ?? [];
  const token = asset?.result as Address | undefined;
  const feedAddress = feed?.result as Address | undefined;

  const extra = useReadContracts({
    allowFailure: true,
    contracts: [
      { address: token, abi: htsTokenAbi, chainId: hub.chainId, functionName: "totalSupply" },
      { address: token, abi: htsTokenAbi, chainId: hub.chainId, functionName: "symbol" },
      { address: feedAddress, abi: aggregatorAbi, chainId: hub.chainId, functionName: "latestRoundData" },
      { address: feedAddress, abi: aggregatorAbi, chainId: hub.chainId, functionName: "decimals" },
    ],
    query: { enabled: Boolean(token && feedAddress), refetchInterval: REFRESH_MS },
  });

  const [supply, symbol, round, priceDecimals] = extra.data ?? [];
  const roundData = round?.result as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const priceUpdatedAt = roundData ? new Date(Number(roundData[3]) * 1000) : undefined;
  const maxAge = maxPriceAge?.result as bigint | undefined;

  const state: HubState = {
    token,
    decimals: (assetDecimals?.result as number | undefined) ?? 6,
    symbol: (symbol?.result as string | undefined) ?? "shares",
    hederaSupply: supply?.result as bigint | undefined,
    nav: nav?.result as bigint | undefined,
    hbarUsd: roundData?.[1],
    priceDecimals: (priceDecimals?.result as number | undefined) ?? 8,
    priceUpdatedAt,
    priceStale:
      priceUpdatedAt !== undefined &&
      maxAge !== undefined &&
      priceUpdatedAt.getTime() + Number(maxAge) * 1000 < Date.now(),
    maxPriceAge: maxAge,
    owner: owner?.result as Address | undefined,
    paused: paused?.result as boolean | undefined,
    spokeIds: (spokeIds?.result as readonly bigint[] | undefined) ?? [],
  };

  return {
    ...state,
    isLoading: base.isLoading || (Boolean(token) && extra.isLoading),
    refetch: () => Promise.all([base.refetch(), extra.refetch()]),
  };
}
