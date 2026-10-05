import { Address, Hex } from "viem";
import { useReadContracts } from "wagmi";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useHubActivity } from "~~/hooks/atollway/useHubActivity";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { hub, spokeGatewayAbi } from "~~/utils/atollway/contracts";
import { HUB_CHAIN_ID } from "~~/utils/atollway/networks";

export type Transfer = {
  id: Hex;
  investor: Address;
  direction: "toSpoke" | "toHub";
  spokeId: number;
  sourceChainId: number;
  destinationChainId: number;
  amount: bigint;
  /** The sending transaction. Unknown for a transfer to Hedera sent from another browser. */
  sourceTx?: Hex;
  /** The hub's receiving transaction, for a transfer that arrived on Hedera. */
  arrivalTx?: Hex;
  /** When it was sent, or when it arrived if the sending time is unknown. */
  time: Date;
};

export type TrackedTransfer = Transfer & {
  /** Whether the destination has applied the transfer. Undefined while unknown. */
  delivered?: boolean;
};

/**
 * Transfers sent from this browser, kept across reloads. Transfers to Hedera are only visible on Hedera once
 * they arrive, so this is how the app follows one while it is on the bridge.
 */
export const useSentTransfers = create<{ transfers: Transfer[]; add: (transfer: Transfer) => void }>()(
  persist(
    set => ({
      transfers: [],
      add: transfer =>
        set(state => ({
          transfers: [transfer, ...state.transfers.filter(item => item.id !== transfer.id)].slice(0, 50),
        })),
    }),
    {
      name: "atollway.sent-transfers",
      storage: createJSONStorage(() => localStorage, {
        replacer: (_, value) => (typeof value === "bigint" ? { bigint: value.toString() } : value),
        reviver: (key, value) => {
          if (value && typeof value === "object" && "bigint" in value)
            return BigInt((value as { bigint: string }).bigint);
          if (key === "time" && typeof value === "string") return new Date(value);
          return value;
        },
      }),
    },
  ),
);

/**
 * The investor's transfers in both directions, newest first, each with whether it has arrived.
 * The hub records transfers to spokes when they leave Hedera and transfers to Hedera when they arrive, so the
 * Hedera mirror node has both. Arrival is read on-chain: `minted` on the spoke or `released` on the hub.
 */
export function useTransfers(investor: Address | undefined) {
  const activity = useHubActivity();
  const { spokes } = useSpokes();
  const sent = useSentTransfers(state => state.transfers);
  const mine = (address: string) => Boolean(investor) && address.toLowerCase() === investor!.toLowerCase();

  const byId = new Map<Hex, Transfer>();
  for (const transfer of sent) if (mine(transfer.investor)) byId.set(transfer.id, transfer);
  for (const event of [...(activity.data ?? [])].reverse()) {
    if (event.kind === "sentToSpoke" && mine(event.investor)) {
      byId.set(event.transferId, {
        id: event.transferId,
        investor: event.investor,
        direction: "toSpoke",
        spokeId: event.spokeId,
        sourceChainId: HUB_CHAIN_ID,
        destinationChainId: event.spokeId,
        amount: event.amount,
        sourceTx: event.txHash,
        time: event.time,
      });
    }
    if (event.kind === "releasedFromSpoke" && mine(event.investor)) {
      const known = byId.get(event.transferId);
      byId.set(event.transferId, {
        id: event.transferId,
        investor: event.investor,
        direction: "toHub",
        spokeId: event.spokeId,
        sourceChainId: event.spokeId,
        destinationChainId: HUB_CHAIN_ID,
        amount: event.amount,
        sourceTx: known?.sourceTx,
        arrivalTx: event.txHash,
        time: known?.time ?? event.time,
      });
    }
  }
  const transfers = [...byId.values()].sort((a, b) => b.time.getTime() - a.time.getTime());

  const delivery = useReadContracts({
    allowFailure: true,
    contracts: transfers.map(transfer =>
      transfer.direction === "toSpoke"
        ? ({
            address: spokes.find(spoke => spoke.chainId === transfer.spokeId)?.gateway,
            abi: spokeGatewayAbi,
            chainId: transfer.spokeId,
            functionName: "minted",
            args: [transfer.id],
          } as const)
        : ({ ...hub, functionName: "released", args: [transfer.id] } as const),
    ),
    query: { enabled: transfers.length > 0 && spokes.length > 0, refetchInterval: 15_000 },
  });

  const tracked: TrackedTransfer[] = transfers.map((transfer, i) => ({
    ...transfer,
    delivered: transfer.arrivalTx ? true : (delivery.data?.[i]?.result as boolean | undefined),
  }));

  return {
    transfers: tracked,
    isLoading: activity.isLoading,
    refetch: () => Promise.all([activity.refetch(), delivery.refetch()]),
  };
}
