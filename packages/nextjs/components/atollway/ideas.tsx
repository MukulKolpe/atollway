import {
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  ChartPieIcon,
  Gamepad2Icon,
  LandmarkIcon,
  LeafIcon,
  MicIcon,
  TicketIcon,
} from "lucide-react";

export type Idea = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** What it is, in a sentence or two. */
  pitch: string;
  /** Where to start in this template. */
  start: string;
  tags: string[];
};

/** Things to build on Atollway, shown on the overview and in the docs. */
export const IDEAS: Idea[] = [
  {
    id: "treasury-fund",
    title: "Tokenized treasury fund",
    icon: LandmarkIcon,
    pitch:
      "A money-market fund whose NAV comes from an oracle instead of the issuer. Holders keep shares on Base or Arbitrum to use as collateral, while KYC stays on Hedera.",
    start: "Replace setNav with a NAV feed in contracts/hub/Subscriptions.sol.",
    tags: ["HTS", "Chainlink", "DeFi"],
  },
  {
    id: "carbon-credits",
    title: "Carbon credit registry",
    icon: LeafIcon,
    pitch:
      "Credits issued on Hedera and traded on any chain. Retiring a credit sends it home and burns it, with the retirement published to a Hedera Consensus Service topic.",
    start: "Extend the RELEASE flow in contracts/hub/SupplyLedger.sol with a retire option.",
    tags: ["HTS", "HCS", "Bridges"],
  },
  {
    id: "real-estate",
    title: "Fractional real estate",
    icon: Building2Icon,
    pitch:
      "One asset per property, with a supply cap for each market's chain and a freeze for disputes. Buyers in different ecosystems hold the same building.",
    start: "Deploy one hub per property and set caps per spoke from the issuer console.",
    tags: ["Caps", "Freeze", "KYC"],
  },
  {
    id: "private-credit",
    title: "Private credit notes",
    icon: CalendarClockIcon,
    pitch:
      "Notes that pay a coupon on every record date. The Hedera Schedule Service runs each payment on time, without a server or a keeper.",
    start: "The payouts milestone on the roadmap: a distributor contract scheduled with the Hedera Schedule Service.",
    tags: ["HSS", "Mirror node"],
  },
  {
    id: "creator-shares",
    title: "Creator revenue shares",
    icon: MicIcon,
    pitch:
      "Fans buy a share of a creator's income with HBAR and hold it on the chain their wallet lives on. Payouts follow the holders wherever they are.",
    start: "Create the token with your own name, and use the approval list as the fan list.",
    tags: ["HTS", "Payouts"],
  },
  {
    id: "index-basket",
    title: "Index basket",
    icon: ChartPieIcon,
    pitch:
      "One token backed by a basket of assets, priced with several Chainlink feeds. Rebalance on Hedera, hold anywhere.",
    start: "Price subscriptions from several feeds in contracts/hub/Subscriptions.sol.",
    tags: ["Chainlink", "HTS"],
  },
  {
    id: "membership",
    title: "Members-only passes",
    icon: TicketIcon,
    pitch:
      "Approval becomes membership. Approve a member once and every chain lets them hold and trade the pass; revoke them and every chain stops them.",
    start: "Use the approval list as is, and change the app's wording in components/atollway.",
    tags: ["KYC", "Compliance sync"],
  },
  {
    id: "employee-equity",
    title: "Employee equity",
    icon: BriefcaseBusinessIcon,
    pitch:
      "Pre-IPO shares that move only between approved wallets. The company freezes shares when someone leaves, on every chain at once.",
    start: "Freeze and revoke from the issuer console; tighten transfers in contracts/spoke/SpokeToken.sol.",
    tags: ["Freeze", "Transfer rules"],
  },
  {
    id: "game-economy",
    title: "Game economies with rules",
    icon: Gamepad2Icon,
    pitch:
      "In-game assets that respect age or region rules per player, on whichever chain the game runs, with one rulebook on Hedera.",
    start: "Map player rules to approval statuses in contracts/common.",
    tags: ["KYC", "Bridges"],
  },
];
