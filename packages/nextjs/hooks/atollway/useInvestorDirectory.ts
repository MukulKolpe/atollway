import { useQuery } from "@tanstack/react-query";
import { Address, getAddress } from "viem";
import { useReadContracts } from "wagmi";
import { useHub } from "~~/hooks/atollway/useHub";
import { useHubActivity } from "~~/hooks/atollway/useHubActivity";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { INVESTOR_STATUS, hub, spokeGatewayAbi } from "~~/utils/atollway/contracts";
import { fetchAccount, fetchTokenHolders } from "~~/utils/atollway/mirror";

export type InvestorStatus = (typeof INVESTOR_STATUS)[number];

export type DirectoryEntry = {
  address: Address;
  accountId?: string;
  /** Whether the account has linked the token on Hedera. */
  associated: boolean;
  /** Shares on Hedera. */
  balance?: bigint;
  status?: InvestorStatus;
  /** The hub's count of status changes. A spoke with a lower count has not applied the latest one. */
  sequence?: bigint;
  /** Per spoke chain: the sequence that spoke has applied. */
  spokeSequences: Record<number, bigint | undefined>;
};

/** EVM addresses of every account associated with the token, from the mirror node. */
async function fetchAssociatedInvestors(token: Address, hubAccount: string | undefined) {
  const holders = await fetchTokenHolders(token);
  const accounts = await Promise.all(
    holders
      .filter(holder => holder.account !== hubAccount)
      .map(async holder => {
        const account = await fetchAccount(holder.account);
        return account?.evm_address
          ? { address: getAddress(account.evm_address), accountId: holder.account, balance: BigInt(holder.balance) }
          : undefined;
      }),
  );
  return accounts.filter(Boolean) as { address: Address; accountId: string; balance: bigint }[];
}

/**
 * Every investor the issuer may need to act on: accounts that linked the token (from the mirror node) and
 * accounts the hub has ever decided on (from its events). Statuses are read on the hub and on every spoke.
 */
export function useInvestorDirectory() {
  const { token } = useHub();
  const { spokes } = useSpokes();
  const activity = useHubActivity();

  const hubAccount = useQuery({
    queryKey: ["atollway", "account", hub.address],
    queryFn: () => fetchAccount(hub.address),
  });

  const associated = useQuery({
    queryKey: ["atollway", "associated", token],
    queryFn: () => fetchAssociatedInvestors(token!, hubAccount.data?.account),
    enabled: Boolean(token) && hubAccount.isFetched,
    refetchInterval: 30_000,
  });

  const known = new Map<string, { address: Address; accountId?: string; balance?: bigint; associated: boolean }>();
  for (const entry of associated.data ?? []) known.set(entry.address.toLowerCase(), { ...entry, associated: true });
  for (const event of activity.data ?? []) {
    if (event.kind !== "investorStatus") continue;
    const key = event.investor.toLowerCase();
    if (!known.has(key)) known.set(key, { address: getAddress(event.investor), associated: false });
  }
  const investors = [...known.values()];

  const statuses = useReadContracts({
    allowFailure: true,
    contracts: investors.flatMap(investor => [
      { ...hub, functionName: "statusOf", args: [investor.address] } as const,
      { ...hub, functionName: "sequenceOf", args: [investor.address] } as const,
    ]),
    query: { enabled: investors.length > 0, refetchInterval: 15_000 },
  });

  const spokeSequences = useReadContracts({
    allowFailure: true,
    contracts: investors.flatMap(investor =>
      spokes.map(
        spoke =>
          ({
            address: spoke.gateway,
            abi: spokeGatewayAbi,
            chainId: spoke.chainId,
            functionName: "sequenceOf",
            args: [investor.address],
          }) as const,
      ),
    ),
    query: { enabled: investors.length > 0 && spokes.length > 0, refetchInterval: 20_000 },
  });

  const entries: DirectoryEntry[] = investors.map((investor, i) => {
    const status = statuses.data?.[i * 2]?.result as number | undefined;
    return {
      ...investor,
      status: status === undefined ? undefined : INVESTOR_STATUS[status],
      sequence: statuses.data?.[i * 2 + 1]?.result as bigint | undefined,
      spokeSequences: Object.fromEntries(
        spokes.map((spoke, j) => [
          spoke.chainId,
          spokeSequences.data?.[i * spokes.length + j]?.result as bigint | undefined,
        ]),
      ),
    };
  });

  return {
    investors: entries,
    isLoading: associated.isLoading || activity.isLoading,
    refetch: () => Promise.all([associated.refetch(), statuses.refetch(), spokeSequences.refetch()]),
  };
}

/** Whether `spokeId` has applied the investor's latest status. */
export function isInSync(entry: DirectoryEntry, spokeId: number) {
  const applied = entry.spokeSequences[spokeId];
  return entry.sequence === undefined || applied === undefined ? undefined : applied >= entry.sequence;
}
