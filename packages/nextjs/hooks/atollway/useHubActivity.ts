import { useQuery } from "@tanstack/react-query";
import { Address, Hex, decodeEventLog } from "viem";
import { INVESTOR_STATUS, hub } from "~~/utils/atollway/contracts";
import { MirrorLog, fetchContractLogs, logTime } from "~~/utils/atollway/mirror";

export type HubEvent =
  | { kind: "subscribed"; investor: Address; hbarAmount: bigint; shares: bigint }
  | { kind: "sentToSpoke"; transferId: Hex; spokeId: number; investor: Address; amount: bigint }
  | { kind: "releasedFromSpoke"; transferId: Hex; spokeId: number; investor: Address; amount: bigint }
  | { kind: "investorStatus"; investor: Address; status: (typeof INVESTOR_STATUS)[number] }
  | { kind: "spokeAdded"; spokeId: number; cap: bigint }
  | { kind: "navUpdated"; nav: bigint }
  | { kind: "paused"; paused: boolean };

export type HubActivity = HubEvent & { txHash: Hex; time: Date; id: string };

function decode(log: MirrorLog): HubEvent | undefined {
  try {
    const event = decodeEventLog({ abi: hub.abi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
    const args = event.args as Record<string, any>;
    switch (event.eventName) {
      case "Subscribed":
        return { kind: "subscribed", investor: args.investor, hbarAmount: args.hbarAmount, shares: args.shares };
      case "SentToSpoke":
      case "ReleasedFromSpoke":
        return {
          kind: event.eventName === "SentToSpoke" ? "sentToSpoke" : "releasedFromSpoke",
          transferId: args.transferId,
          spokeId: Number(args.spokeId),
          investor: args.investor,
          amount: args.amount,
        };
      case "InvestorStatusChanged":
        return { kind: "investorStatus", investor: args.account, status: INVESTOR_STATUS[Number(args.status)] };
      case "SpokeAdded":
        return { kind: "spokeAdded", spokeId: Number(args.spokeId), cap: args.cap };
      case "NavUpdated":
        return { kind: "navUpdated", nav: args.nav };
      case "PausedChanged":
        return { kind: "paused", paused: args.paused };
    }
  } catch {
    // Logs from other contracts in the same transaction, such as the HTS token, are not hub events.
  }
  return undefined;
}

/**
 * The hub's events, newest first, from the Hedera mirror node.
 */
export function useHubActivity() {
  return useQuery({
    queryKey: ["atollway", "hub-activity", hub.address],
    queryFn: async () => {
      const logs = await fetchContractLogs(hub.address);
      return logs.flatMap(log => {
        const event = decode(log);
        return event
          ? [{ ...event, txHash: log.transaction_hash, time: logTime(log), id: `${log.timestamp}-${log.index}` }]
          : [];
      }) as HubActivity[];
    },
    refetchInterval: 15_000,
  });
}
