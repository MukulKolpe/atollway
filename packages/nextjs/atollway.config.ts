import { arbitrumSepolia, baseSepolia } from "viem/chains";
import { hederaTestnet, robinhoodTestnet } from "~~/scaffold.config";

/** How a chain looks in the app. */
export type NetworkProfile = {
  /** Short name for tight spaces. */
  name: string;
  /** The chain's colour, a CSS variable from styles/globals.css. */
  color: string;
  /** One character for the chain's badge. */
  glyph: string;
  /** Where to get testnet gas. */
  faucet: string;
};

/** How a spoke reaches the hub. The bridge itself comes from the transport contracts deployed on the spoke. */
export type SpokeRoute = {
  /** The chain of the CCIP relay, for a spoke with no direct CCIP lane to the hub. See docs/adr/0009-ccip-relay.md. */
  relayChainId?: number;
  /** Typical minutes for a message to arrive, measured on testnet. Mostly the source chain's finality. */
  minutesFromHub: number;
  minutesToHub: number;
};

const atollwayConfig = {
  /** The project, for links and the command that scaffolds it. Change these when you fork the template. */
  project: {
    repository: "https://github.com/MukulKolpe/atollway",
    template: "MukulKolpe/atollway",
    author: {
      name: "Mukul",
      github: "https://github.com/MukulKolpe",
      twitter: "https://twitter.com/MukulKolpe",
    },
  },

  /** The chain the asset is issued on. */
  hubChainId: hederaTestnet.id,

  /** Hedera mirror node, used for token associations, KYC status and the hub's event history. */
  mirrorNode: process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com",

  networks: {
    [hederaTestnet.id]: {
      name: "Hedera",
      color: "var(--chain-hedera)",
      glyph: "ℏ",
      faucet: "https://portal.hedera.com/faucet",
    },
    [baseSepolia.id]: {
      name: "Base",
      color: "var(--chain-base)",
      glyph: "B",
      faucet: "https://faucets.chain.link/base-sepolia",
    },
    [arbitrumSepolia.id]: {
      name: "Arbitrum",
      color: "var(--chain-arbitrum)",
      glyph: "A",
      faucet: "https://faucets.chain.link/arbitrum-sepolia",
    },
    [robinhoodTestnet.id]: {
      name: "Robinhood Chain",
      color: "var(--chain-robinhood)",
      glyph: "R",
      faucet: "https://faucet.quicknode.com/robinhood/testnet",
    },
  } as Record<number, NetworkProfile>,

  routes: {
    [baseSepolia.id]: {
      minutesFromHub: 3,
      minutesToHub: 26,
    },
    [arbitrumSepolia.id]: {
      minutesFromHub: 1,
      minutesToHub: 16,
    },
    [robinhoodTestnet.id]: {
      relayChainId: baseSepolia.id,
      minutesFromHub: 20,
      minutesToHub: 45,
    },
  } as Record<number, SpokeRoute>,
} as const;

export default atollwayConfig;
