import type { Chain } from "viem";
import atollwayConfig, { NetworkProfile } from "~~/atollway.config";
import scaffoldConfig from "~~/scaffold.config";

export const HUB_CHAIN_ID = atollwayConfig.hubChainId;

/** Every chain the app works with: the hub first, then the spokes. */
export const NETWORKS: readonly Chain[] = scaffoldConfig.targetNetworks;

export function getChain(chainId: number): Chain | undefined {
  return NETWORKS.find(chain => chain.id === chainId);
}

export function getProfile(chainId: number): NetworkProfile {
  return (
    atollwayConfig.networks[chainId] ?? {
      name: getChain(chainId)?.name ?? `Chain ${chainId}`,
      color: "var(--muted-foreground)",
      glyph: "?",
      faucet: "",
    }
  );
}

export function isHub(chainId: number | undefined) {
  return chainId === HUB_CHAIN_ID;
}

function explorer(chainId: number) {
  return getChain(chainId)?.blockExplorers?.default.url ?? "";
}

/** A transaction on the chain's explorer. HashScan accepts EVM transaction hashes. */
export function txUrl(chainId: number, hash: string) {
  return `${explorer(chainId)}/tx/${hash}`;
}

/** An account on the chain's explorer. */
export function accountUrl(chainId: number, address: string) {
  return `${explorer(chainId)}/${isHub(chainId) ? "account" : "address"}/${address}`;
}

/** A contract on the chain's explorer. */
export function contractUrl(chainId: number, address: string) {
  return `${explorer(chainId)}/${isHub(chainId) ? "contract" : "address"}/${address}`;
}
