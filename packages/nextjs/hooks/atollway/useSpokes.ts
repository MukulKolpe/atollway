import { Address } from "viem";
import { useReadContracts } from "wagmi";
import atollwayConfig, { SpokeRoute } from "~~/atollway.config";
import { useHub } from "~~/hooks/atollway/useHub";
import {
  Bridge,
  bridgeOf,
  hub,
  spokeGatewayAbi,
  spokeGatewayAddress,
  spokeTokenAbi,
} from "~~/utils/atollway/contracts";

const REFRESH_MS = 20_000;

export type Spoke = {
  chainId: number;
  bridge?: Bridge;
  route?: SpokeRoute;
  gateway?: Address;
  token?: Address;
  /** The hub's transport adapter for this spoke. Zero means disconnected. */
  transport?: Address;
  /** The most the spoke may hold, in the asset's smallest unit. */
  cap?: bigint;
  /** What the hub's ledger says the spoke holds. */
  outstanding?: bigint;
  /** The spoke token's own supply, read on the spoke chain. */
  supply?: bigint;
  hubPaused?: boolean;
  guardianPaused?: boolean;
};

/**
 * Every spoke registered on the hub, with the hub's ledger entry and the state read on the spoke's own chain.
 */
export function useSpokes() {
  const { spokeIds, isLoading: hubLoading } = useHub();
  const chainIds = spokeIds.map(id => Number(id));

  const ledger = useReadContracts({
    allowFailure: true,
    contracts: spokeIds.map(id => ({ ...hub, functionName: "spokes", args: [id] }) as const),
    query: { enabled: spokeIds.length > 0, refetchInterval: REFRESH_MS },
  });

  const gateways = useReadContracts({
    allowFailure: true,
    contracts: chainIds.flatMap(chainId => {
      const gateway = { address: spokeGatewayAddress(chainId), abi: spokeGatewayAbi, chainId } as const;
      return [
        { ...gateway, functionName: "token" },
        { ...gateway, functionName: "hubPaused" },
        { ...gateway, functionName: "guardianPaused" },
      ] as const;
    }),
    query: { enabled: chainIds.length > 0, refetchInterval: REFRESH_MS },
  });

  const tokens = chainIds.map((_, i) => gateways.data?.[i * 3]?.result as Address | undefined);

  const supplies = useReadContracts({
    allowFailure: true,
    contracts: chainIds.map(
      (chainId, i) => ({ address: tokens[i], abi: spokeTokenAbi, chainId, functionName: "totalSupply" }) as const,
    ),
    query: { enabled: tokens.some(Boolean), refetchInterval: REFRESH_MS },
  });

  const spokes: Spoke[] = chainIds.map((chainId, i) => {
    const entry = ledger.data?.[i]?.result as readonly [Address, bigint, bigint, boolean] | undefined;
    return {
      chainId,
      bridge: bridgeOf(chainId),
      route: atollwayConfig.routes[chainId],
      gateway: spokeGatewayAddress(chainId),
      token: tokens[i],
      transport: entry?.[0],
      cap: entry?.[1],
      outstanding: entry?.[2],
      supply: supplies.data?.[i]?.result as bigint | undefined,
      hubPaused: gateways.data?.[i * 3 + 1]?.result as boolean | undefined,
      guardianPaused: gateways.data?.[i * 3 + 2]?.result as boolean | undefined,
    };
  });

  return {
    spokes,
    isLoading: hubLoading || ledger.isLoading || gateways.isLoading,
    refetch: () => Promise.all([ledger.refetch(), gateways.refetch(), supplies.refetch()]),
  };
}
