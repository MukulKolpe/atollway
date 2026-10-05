import { Address, Hex } from "viem";
import atollwayConfig from "~~/atollway.config";

const MIRROR = `${atollwayConfig.mirrorNode}/api/v1`;

/** A contract log as the mirror node returns it. */
export type MirrorLog = {
  address: Address;
  data: Hex;
  topics: Hex[];
  /** Consensus time, seconds.nanoseconds. */
  timestamp: string;
  transaction_hash: Hex;
  block_number: number;
  index: number;
};

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(path.startsWith("http") ? path : `${MIRROR}${path}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Mirror node request failed: ${response.status}`);
  return (await response.json()) as T;
}

/** The newest logs of a contract, newest first, up to `pages` pages of 100. */
export async function fetchContractLogs(contract: Address, pages = 3): Promise<MirrorLog[]> {
  const logs: MirrorLog[] = [];
  let next: string | undefined = `/contracts/${contract}/results/logs?order=desc&limit=100`;
  for (let page = 0; page < pages && next; page++) {
    const result: { logs: MirrorLog[]; links?: { next?: string | null } } | null = await get(next);
    logs.push(...(result?.logs ?? []));
    next = result?.links?.next ? `${atollwayConfig.mirrorNode}${result.links.next}` : undefined;
  }
  return logs;
}

export function logTime(log: MirrorLog) {
  return new Date(Number(log.timestamp.split(".")[0]) * 1000);
}

/** The Hedera ID of an HTS token, from its long-zero EVM address. */
export function tokenIdOf(token: Address) {
  return `0.0.${BigInt(token)}`;
}

export type MirrorAccount = { account: string; evm_address: Address; balance: { balance: number } };

/** A Hedera account by EVM address or account ID, or null if there is none yet. */
export function fetchAccount(addressOrId: string) {
  return get<MirrorAccount>(`/accounts/${addressOrId}?transactions=false`);
}

/** Every account associated with `token`, with its balance. */
export async function fetchTokenHolders(token: Address) {
  const holders: { account: string; balance: number }[] = [];
  let next: string | undefined = `/tokens/${tokenIdOf(token)}/balances?limit=100`;
  while (next) {
    const result: { balances: { account: string; balance: number }[]; links?: { next?: string | null } } | null =
      await get(next);
    holders.push(...(result?.balances ?? []));
    next = result?.links?.next ? `${atollwayConfig.mirrorNode}${result.links.next}` : undefined;
  }
  return holders;
}
