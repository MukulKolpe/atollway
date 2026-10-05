import { defineChain } from "viem";
import * as chains from "viem/chains";

export type ScaffoldConfig = {
  targetNetworks: readonly [chains.Chain, ...chains.Chain[]];
  pollingInterval: number;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
};

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";

/** Hedera testnet, with the Multicall3 contract that viem's definition leaves out. */
export const hederaTestnet = defineChain({
  ...chains.hederaTestnet,
  contracts: { multicall3: { address: MULTICALL3 } },
});

/** Robinhood Chain testnet, which viem does not define yet. */
export const robinhoodTestnet = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" } },
  contracts: { multicall3: { address: MULTICALL3 } },
  testnet: true,
});

// The hub chain comes first: the app reads from it until a wallet connects.
const targetNetworks = [hederaTestnet, chains.baseSepolia, chains.arbitrumSepolia, robinhoodTestnet] as const;

const scaffoldConfig = {
  targetNetworks,

  pollingInterval: 10000,

  rpcOverrides: {
    [hederaTestnet.id]: process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api",
    [chains.baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    [chains.arbitrumSepolia.id]:
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    [robinhoodTestnet.id]:
      process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com",
  },

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
