import * as chains from "viem/chains";
import scaffoldConfig, { robinhoodTestnet } from "~~/scaffold.config";

type ChainAttributes = {
  // color | [lightThemeColor, darkThemeColor]
  color: string | [string, string];
  // Used to fetch price by providing mainnet token address
  // for networks having native currency other than ETH
  nativeCurrencyTokenAddress?: string;
};

export type ChainWithAttributes = chains.Chain & Partial<ChainAttributes>;
export type AllowedChainIds = (typeof scaffoldConfig.targetNetworks)[number]["id"];

const HEDERA_CHAIN_IDS: Set<number> = new Set([chains.hedera.id, chains.hederaTestnet.id]);

export const NETWORKS_EXTRA_DATA: Record<string, ChainAttributes> = {
  [chains.mainnet.id]: {
    color: "#ff8b9e",
  },
  [chains.hedera.id]: {
    color: "#8259EF",
  },
  [chains.hederaTestnet.id]: {
    color: ["#8259EF", "#A98AFF"],
  },
  [chains.baseSepolia.id]: {
    color: ["#0052FF", "#5C8BFF"],
  },
  [chains.arbitrumSepolia.id]: {
    color: ["#1B9AE0", "#5EC0FF"],
  },
  [robinhoodTestnet.id]: {
    color: ["#5E9E00", "#C6F432"],
  },
};

/**
 * Gives the block explorer transaction URL.
 */
export function getBlockExplorerTxLink(chainId: number, txnHash: string) {
  const targetNetwork = scaffoldConfig.targetNetworks.find(network => network.id === chainId);
  if (targetNetwork?.blockExplorers?.default?.url) {
    return `${targetNetwork.blockExplorers.default.url}/tx/${txnHash}`;
  }

  const chainNames = Object.keys(chains);

  const targetChainArr = chainNames.filter(chainName => {
    const wagmiChain = chains[chainName as keyof typeof chains];
    return wagmiChain.id === chainId;
  });

  if (targetChainArr.length === 0) {
    return "";
  }

  const targetChain = targetChainArr[0] as keyof typeof chains;
  const blockExplorerTxURL = chains[targetChain]?.blockExplorers?.default?.url;

  if (!blockExplorerTxURL) {
    return "";
  }

  return `${blockExplorerTxURL}/tx/${txnHash}`;
}

/**
 * Gives the block explorer URL for a given address.
 * HashScan uses /account/ instead of /address/ for Hedera chains.
 */
export function getBlockExplorerAddressLink(network: chains.Chain, address: string) {
  const blockExplorerBaseURL = network.blockExplorers?.default?.url;

  if (!blockExplorerBaseURL) {
    return `https://hashscan.io/testnet/account/${address}`;
  }

  const pathSegment = HEDERA_CHAIN_IDS.has(network.id) ? "account" : "address";
  return `${blockExplorerBaseURL}/${pathSegment}/${address}`;
}

/**
 * @returns targetNetworks array containing networks configured in scaffold.config including extra network metadata
 */
export function getTargetNetworks(): ChainWithAttributes[] {
  return scaffoldConfig.targetNetworks.map(targetNetwork => ({
    ...targetNetwork,
    ...NETWORKS_EXTRA_DATA[targetNetwork.id],
  }));
}
