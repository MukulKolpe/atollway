import { useQuery } from "@tanstack/react-query";
import { Address, parseAbi } from "viem";
import { useBalance, useReadContract, useReadContracts } from "wagmi";
import { useHub } from "~~/hooks/atollway/useHub";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { INVESTOR_STATUS, htsTokenAbi, hub, spokeGatewayAbi, spokeTokenAbi } from "~~/utils/atollway/contracts";
import { fetchAccount } from "~~/utils/atollway/mirror";

const REFRESH_MS = 12_000;

// HIP-719: whether the caller is associated with the token. It reads `msg.sender`, so it cannot go through Multicall3.
const isAssociatedAbi = parseAbi(["function isAssociated() view returns (bool)"]);

export type InvestorStatus = (typeof INVESTOR_STATUS)[number];

export type Holding = { chainId: number; balance?: bigint; status?: InvestorStatus };

/**
 * Everything the app knows about one investor: their Hedera account, the token link, the issuer's decision and
 * their shares on every chain.
 */
export function useInvestor(address: Address | undefined) {
  const { token, decimals, symbol } = useHub();
  const { spokes } = useSpokes();
  const enabled = Boolean(address);

  const account = useQuery({
    queryKey: ["atollway", "account", address],
    queryFn: () => fetchAccount(address!),
    enabled,
    refetchInterval: query => (query.state.data ? false : REFRESH_MS),
  });

  const associated = useReadContract({
    address: token,
    abi: isAssociatedAbi,
    functionName: "isAssociated",
    chainId: hub.chainId,
    account: address,
    query: { enabled: enabled && Boolean(token) && Boolean(account.data), refetchInterval: REFRESH_MS },
  });

  const hederaReads = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...hub, functionName: "statusOf", args: [address!] },
      { address: token, abi: htsTokenAbi, chainId: hub.chainId, functionName: "balanceOf", args: [address!] },
    ],
    query: { enabled: enabled && Boolean(token), refetchInterval: REFRESH_MS },
  });

  const spokeReads = useReadContracts({
    allowFailure: true,
    contracts: spokes.flatMap(spoke => [
      {
        address: spoke.token,
        abi: spokeTokenAbi,
        chainId: spoke.chainId,
        functionName: "balanceOf",
        args: [address!],
      } as const,
      {
        address: spoke.gateway,
        abi: spokeGatewayAbi,
        chainId: spoke.chainId,
        functionName: "statusOf",
        args: [address!],
      } as const,
    ]),
    query: { enabled: enabled && spokes.every(spoke => spoke.token), refetchInterval: REFRESH_MS },
  });

  const hbar = useBalance({ address, chainId: hub.chainId, query: { enabled, refetchInterval: REFRESH_MS } });

  const statusIndex = hederaReads.data?.[0]?.result as number | undefined;
  const status = statusIndex === undefined ? undefined : INVESTOR_STATUS[statusIndex];
  const hederaBalance = hederaReads.data?.[1]?.result as bigint | undefined;

  const holdings: Holding[] = [
    { chainId: hub.chainId, balance: hederaBalance, status },
    ...spokes.map((spoke, i) => {
      const spokeStatus = spokeReads.data?.[i * 2 + 1]?.result as number | undefined;
      return {
        chainId: spoke.chainId,
        balance: spokeReads.data?.[i * 2]?.result as bigint | undefined,
        status: spokeStatus === undefined ? undefined : INVESTOR_STATUS[spokeStatus],
      };
    }),
  ];

  const total = holdings.every(holding => holding.balance !== undefined)
    ? holdings.reduce((sum, holding) => sum + (holding.balance ?? 0n), 0n)
    : undefined;

  return {
    decimals,
    symbol,
    token,
    /** Whether the address has a Hedera account. Undefined while loading. */
    hasAccount: account.isLoading ? undefined : Boolean(account.data),
    accountId: account.data?.account,
    isAssociated: associated.data,
    status,
    holdings,
    total,
    hbarBalance: hbar.data?.value,
    isLoading: account.isLoading || hederaReads.isLoading,
    refetch: () =>
      Promise.all([
        account.refetch(),
        associated.refetch(),
        hederaReads.refetch(),
        spokeReads.refetch(),
        hbar.refetch(),
      ]),
  };
}
