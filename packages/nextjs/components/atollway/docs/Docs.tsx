"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  BookOpenIcon,
  CalendarClockIcon,
  ChartPieIcon,
  CoinsIcon,
  CompassIcon,
  CpuIcon,
  DatabaseIcon,
  HammerIcon,
  HouseIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PaletteIcon,
  PlaneTakeoffIcon,
  RadioTowerIcon,
  RouteIcon,
  ScaleIcon,
  ServerOffIcon,
  ShieldCheckIcon,
  SproutIcon,
  TimerIcon,
  TriangleAlertIcon,
  UserRoundIcon,
  WaypointsIcon,
} from "lucide-react";
import { formatUnits } from "viem";
import atollwayConfig from "~~/atollway.config";
import { GitHubIcon } from "~~/components/atollway/BrandIcons";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { CopyCommand } from "~~/components/atollway/CopyCommand";
import { IDEAS } from "~~/components/atollway/ideas";
import { NetworkMap } from "~~/components/atollway/overview/NetworkMap";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent } from "~~/components/ui/card";
import { useSupply } from "~~/hooks/atollway/useSupply";
import { cn } from "~~/lib/utils";
import { HUB_CHAIN_ID } from "~~/utils/atollway/networks";

const { project } = atollwayConfig;
const repoFile = (path: string) => `${project.repository}/blob/main/${path}`;
const SCAFFOLD = `npm create scaffold-hbar@latest my-fund -- --template ${project.template}`;

const SECTIONS = [
  { id: "the-idea", label: "The idea" },
  { id: "set-it-up", label: "Set it up" },
  { id: "next", label: "Where to go next" },
  { id: "blocks", label: "Building blocks" },
  { id: "life-of-a-token", label: "The life of a token" },
  { id: "inside", label: "Inside the box" },
  { id: "ideas", label: "What you can build" },
  { id: "hedera", label: "Hedera underneath" },
  { id: "good-to-know", label: "Good to know" },
];

/** Highlights the section being read in the table of contents. */
function useActiveSection() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

const Section = ({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section id={id} className="flex scroll-mt-24 flex-col gap-6 border-t border-border/60 pt-14">
    <div className="flex max-w-3xl flex-col gap-3">
      <span className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</span>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {lead && <p className="text-lg leading-relaxed text-muted-foreground">{lead}</p>}
    </div>
    {children}
  </section>
);

const IconTile = ({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) => (
  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-chain-hedera/20 text-primary">
    <Icon className="size-5" />
  </span>
);

const SETUP = [
  {
    title: "Scaffold your project",
    text: "The Scaffold-HBAR CLI copies the template into a new folder, installs the dependencies and lists the next steps. Name the folder anything you like.",
    command: `${SCAFFOLD}\ncd my-fund`,
  },
  {
    title: "See it work before you change anything",
    text: "The contract tests take seconds. The simulation runs the hub against Hedera testnet through the mirror node, and the other chains against forks of their testnets, without spending anything.",
    command: "yarn foundry:test\nyarn foundry:simulate",
  },
  {
    title: "Bring an issuer account",
    text: "Create a Hedera testnet account with an ECDSA key in the Hedera portal and fund it from the faucet. Import its private key into an encrypted Foundry keystore: you type it at the prompt, never into a file.",
    command: "yarn foundry:account:import atollway-issuer",
  },
  {
    title: "Deploy your hub to Hedera testnet",
    text: "The account that deploys becomes the issuer. The script writes the hub's address and ABI into the app, so the app shows your hub from now on.",
    command: "yarn foundry:deploy --network hedera_testnet --keystore atollway-issuer",
  },
  {
    title: "Open the app and create your token",
    text: "Start the app, connect the issuer's wallet and open the issuer console. Name your token and create it, then set its price under Settings to open minting.",
    command: "yarn next:dev",
    link: { href: "/issuer", label: "Open the issuer console" },
  },
  {
    title: "Run the whole loop",
    text: "With a second wallet, link the token to its Hedera account in the app. Approve that account in the issuer console, mint a few tokens with HBAR and send them to another chain. Every rule you set travels with them.",
    link: { href: "/invest", label: "Try it in the app" },
  },
];

const NEXT = [
  {
    icon: RouteIcon,
    title: "Add a chain",
    text: "Deploy a spoke on Base, Arbitrum or any chain Axelar or Chainlink CCIP reaches, register it on the hub, and add it to the app's config.",
    href: repoFile("packages/foundry/README.md"),
    action: "Spoke deploy guide",
  },
  {
    icon: ShieldCheckIcon,
    title: "Set the rules",
    text: "Approve, freeze and revoke accounts from the issuer console, and watch each decision reach every chain. Resend it to a chain that missed it.",
    href: "/issuer",
    action: "Issuer console",
  },
  {
    icon: WaypointsIcon,
    title: "Move tokens across chains",
    text: "Send tokens from Hedera to another chain and back, and follow every hop through Axelar or CCIP on the transfer timeline.",
    href: "/invest",
    action: "Open the app",
  },
  {
    icon: PaletteIcon,
    title: "Make it look like yours",
    text: "Change the colours in styles/globals.css, the chains and links in atollway.config.ts, and add components with the shadcn CLI.",
    href: "#inside",
    action: "Where things live",
  },
  {
    icon: HammerIcon,
    title: "Change the rules",
    text: "Price from an oracle, add tiers of access or tighten transfers. The contracts are small modules with their tests next to them.",
    href: "#ideas",
    action: "Ideas to start from",
  },
  {
    icon: BookOpenIcon,
    title: "Read why it is built this way",
    text: "Nine decision records explain the design, from Hedera as the hub to the relay on Base, and the architecture document covers failure modes.",
    href: repoFile("docs/adr/README.md"),
    action: "Decision records",
  },
];

const BLOCKS = [
  {
    icon: KeyRoundIcon,
    title: "Rules the network enforces",
    text: "Allowlist, freeze, revoke and pause come from the Hedera Token Service itself. One decision on Hedera applies on every chain.",
    where: "contracts/hub",
  },
  {
    icon: CoinsIcon,
    title: "Priced minting",
    text: "Mint tokens for HBAR at a price you set, valued with Chainlink's HBAR/USD feed, with protection against price moves.",
    where: "contracts/hub/Subscriptions.sol",
  },
  {
    icon: ScaleIcon,
    title: "A cap for every chain",
    text: "Limit what each chain may hold. Even a misbehaving bridge cannot create more than the caps of the chains behind it.",
    where: "contracts/hub/SpokeRegistry.sol",
  },
  {
    icon: WaypointsIcon,
    title: "Movement across chains",
    text: "Burn on one chain and mint on another, over Axelar or Chainlink CCIP, with a relay for chains that have no direct route.",
    where: "contracts/transports",
  },
  {
    icon: DatabaseIcon,
    title: "A ledger that always balances",
    text: "What Hedera holds plus what each chain holds is always everything issued, and the history lives on the mirror node.",
    where: "contracts/hub/SupplyLedger.sol",
  },
  {
    icon: LayoutDashboardIcon,
    title: "An app to build on",
    text: "A live overview, an issuer console, a holder portal with transfer timelines, and these docs, on shadcn/ui.",
    where: "packages/nextjs",
  },
];

const LIFE = [
  {
    icon: SproutIcon,
    title: "Born on Hedera",
    text: "The issuer creates the token with the Hedera Token Service. The hub contract is its treasury and holds its KYC, freeze, wipe, supply and pause keys, so no person can go around the rules.",
    detail: "createAsset",
    chains: [HUB_CHAIN_ID],
    time: "seconds",
  },
  {
    icon: CoinsIcon,
    title: "Minted for HBAR",
    text: "An approved account pays HBAR. Chainlink's HBAR/USD price and the price you set decide how many tokens it gets, and they arrive in the same transaction.",
    detail: "subscribe",
    chains: [HUB_CHAIN_ID],
    time: "seconds",
  },
  {
    icon: BadgeCheckIcon,
    title: "Cleared everywhere",
    text: "Approving an account grants it KYC on Hedera and sends a numbered COMPLIANCE message to every chain, so none ever applies an older decision over a newer one.",
    detail: "COMPLIANCE message",
    chains: [HUB_CHAIN_ID, 84532, 421614, 46630],
    time: "minutes",
  },
  {
    icon: PlaneTakeoffIcon,
    title: "Off to another chain",
    text: "A holder sends tokens to another chain. The hub burns them on Hedera and records them against that chain's cap, and the bridge delivers a MINT there.",
    detail: "sendToSpoke → MINT",
    chains: [HUB_CHAIN_ID, 421614],
    time: "1 to 20 min",
  },
  {
    icon: HouseIcon,
    title: "Home again",
    text: "The holder sends them back. The gateway burns them on that chain, and the hub releases the same amount on Hedera, once per transfer.",
    detail: "sendToHub → RELEASE",
    chains: [46630, HUB_CHAIN_ID],
    time: "15 to 45 min",
  },
  {
    icon: CalendarClockIcon,
    title: "Paid on schedule",
    text: "Next on the roadmap: the Hedera Schedule Service pays holders on every record date, wherever their tokens are, with no server or keeper.",
    detail: "Hedera Schedule Service",
    chains: [HUB_CHAIN_ID],
    time: "coming next",
    upcoming: true,
  },
];

const TREE: [string, string][] = [
  ["packages/foundry/contracts/hub/", "the hub: the token, approvals, pricing, ledger"],
  ["packages/foundry/contracts/spoke/", "the gateway and the mirror token on other chains"],
  ["packages/foundry/contracts/transports/", "Axelar, Chainlink CCIP and the relay"],
  ["packages/foundry/script/", "deploy and connect scripts"],
  ["packages/foundry/test/", "unit, integration, fork and simulation tests"],
  ["packages/nextjs/app/", "the app's pages"],
  ["packages/nextjs/components/atollway/", "the app's components"],
  ["packages/nextjs/atollway.config.ts", "chains, routes and project links"],
  ["docs/", "architecture, decision records, deployments"],
  ["AGENTS.md", "a guide for AI coding agents"],
];

const RECIPES = [
  ["Rename the token", "Create it with your own name and symbol in the issuer console"],
  ["Price it differently", "setNav in Settings, or the price feed in script/Deploy.s.sol"],
  ["Add a chain", "A spoke script, then scaffold.config.ts and atollway.config.ts"],
  ["Use another bridge", "Implement ITransport in contracts/transports"],
  ["Change who can hold", "The approval rules in contracts/hub and contracts/common"],
  ["Restyle the app", "styles/globals.css, and npx shadcn@latest add for more components"],
];

const SERVICES = [
  {
    icon: KeyRoundIcon,
    title: "Token Service",
    text: "The token itself, with KYC, freeze, wipe, supply and pause keys held by the hub.",
  },
  {
    icon: CpuIcon,
    title: "Smart contracts",
    text: "The hub's modules: approvals, minting, the chain registry and the supply ledger.",
  },
  {
    icon: DatabaseIcon,
    title: "Mirror node",
    text: "The hub's history, the accounts that linked the token, and Hedera account IDs.",
  },
  {
    icon: RadioTowerIcon,
    title: "JSON-RPC relay",
    text: "Wallets and contract reads, converting between 18 decimals and tinybars.",
  },
  { icon: ChartPieIcon, title: "Chainlink on Hedera", text: "The HBAR/USD price behind every mint." },
  {
    icon: NetworkIcon,
    title: "Axelar and CCIP",
    text: "The messages that carry decisions and tokens between the hub and the other chains.",
  },
  { icon: CalendarClockIcon, title: "Schedule Service", text: "Scheduled payouts to holders, next on the roadmap." },
];

const NOTES = [
  {
    icon: TriangleAlertIcon,
    title: "Unaudited, testnet first",
    text: "The contracts are tested and checked against live testnets, but not audited. Keep real assets away until they are.",
  },
  {
    icon: TimerIcon,
    title: "Bridges are patient",
    text: "Leaving Hedera takes a minute or two. Arriving on Hedera waits for the other chain to finalize, up to about 45 minutes. A failed message can be retried from Axelarscan or the CCIP Explorer, and the ledger keeps counting it meanwhile.",
  },
  {
    icon: ServerOffIcon,
    title: "No backend, no keys",
    text: "The app reads the chains, the mirror node and the bridge APIs from your browser. Every transaction is simulated first, then signed in your wallet.",
  },
  {
    icon: CompassIcon,
    title: "Hedera is the hub on purpose",
    text: "Compliance is native to the Token Service, fees are low and fixed, and scheduled execution is built in. Decision record 0001 tells the full story.",
  },
];

/**
 * The in-app guide to the template, written as a starter for tokenization projects: the idea, how to set it up,
 * where to go next, its building blocks, and what to build with it.
 */
export const Docs = () => {
  const active = useActiveSection();
  const { hub, spokes, total } = useSupply();
  const amount = (value?: bigint) =>
    value === undefined
      ? "…"
      : Number(formatUnits(value, hub.decimals)).toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-10 pb-24 sm:px-6 lg:grid-cols-[13rem_1fr] lg:pt-14">
      <aside className="hidden lg:block">
        <nav className="sticky top-28 flex flex-col gap-1">
          <span className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">On this page</span>
          {SECTIONS.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "border-l-2 border-transparent py-1.5 pl-4 text-base text-muted-foreground transition-colors hover:text-foreground",
                active === section.id && "border-primary font-medium text-foreground",
              )}
            >
              {section.label}
            </a>
          ))}
          <a
            href={project.repository}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center gap-2 pl-4 text-base text-muted-foreground hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
            Source on GitHub
          </a>
        </nav>
      </aside>

      <article className="flex min-w-0 flex-col gap-14">
        <section id="the-idea" className="grid scroll-mt-24 items-center gap-10 xl:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <Badge variant="outline" className="h-8 w-fit gap-1.5 rounded-full bg-card/60 px-3.5 text-sm">
              <BookOpenIcon className="text-primary" />
              Docs · a tokenization starter
            </Badge>
            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
              Tokenize once. <span className="text-gradient">Let it travel.</span>
            </h1>
            <p className="text-xl leading-relaxed text-muted-foreground">
              Atollway is a starter for building with tokens that carry their own rules. Issue a token on Hedera with
              allowlists, freezes and caps enforced by the network, and let it move to Base, Arbitrum, Robinhood Chain
              or any chain you add. The rules travel with it.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              An atoll is a ring of islands around one lagoon. Here the lagoon is Hedera, where the rules live, and the
              islands are the chains where tokens are used. The demo is a fund; yours could be carbon credits, a
              building, a membership, a game economy or anything else worth owning.
            </p>
            <Button asChild size="lg" className="h-11 w-fit rounded-full px-5 text-base">
              <a href="#set-it-up">
                Set it up in six steps
                <ArrowRightIcon />
              </a>
            </Button>
          </div>
          <Card className="glass relative overflow-hidden p-2">
            <div aria-hidden className="absolute inset-0 bg-grid" />
            <NetworkMap
              className="relative"
              spokes={spokes}
              hederaSupply={hub.hederaSupply}
              totalSupply={total}
              decimals={hub.decimals}
              symbol={hub.symbol}
            />
          </Card>
        </section>

        <Section
          id="set-it-up"
          eyebrow="Set it up"
          title="From one command to tokens on several chains"
          lead="You need Node.js 22, Yarn, Foundry, Git and a wallet such as MetaMask. Six steps take you from an empty folder to your own token, minted and moving between chains on testnet."
        >
          <ol className="flex flex-col">
            {SETUP.map((step, i) => (
              <li key={step.title} className="relative flex gap-5 pb-10 last:pb-0">
                {i < SETUP.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-12 left-[23px] h-[calc(100%-3rem)] w-px bg-gradient-to-b from-primary/60 to-border"
                  />
                )}
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chain-hedera text-lg font-semibold text-primary-foreground shadow-md">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3 pt-2">
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">{step.text}</p>
                  {step.command && <CopyCommand command={step.command} className="max-w-3xl" />}
                  {step.link && (
                    <Link
                      href={step.link.href}
                      className="flex w-fit items-center gap-1.5 text-base font-medium text-primary hover:underline"
                    >
                      {step.link.label}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="next"
          eyebrow="Then"
          title="Where to go from there"
          lead="With a hub, a token and the loop working, everything else is a step away."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {NEXT.map(item => {
              const external = item.href.startsWith("http");
              return (
                <a
                  key={item.title}
                  href={item.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="group"
                >
                  <Card className="glass h-full transition-colors group-hover:border-primary/50">
                    <CardContent className="flex h-full flex-col gap-3">
                      <IconTile icon={item.icon} />
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      <p className="text-base text-muted-foreground">{item.text}</p>
                      <span className="mt-auto flex items-center gap-1 text-base font-medium text-primary">
                        {item.action}
                        <ArrowUpRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        </Section>

        <Section
          id="blocks"
          eyebrow="What you get"
          title="Building blocks"
          lead="Six pieces you can keep, swap or recombine. Most ideas worth building are a new mix of them."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BLOCKS.map((block, i) => (
              <Card key={block.title} className="glass relative overflow-hidden">
                <span
                  aria-hidden
                  className="absolute -top-3 -right-1 font-mono text-7xl font-bold text-foreground/[0.04] select-none"
                >
                  0{i + 1}
                </span>
                <CardContent className="relative flex h-full flex-col gap-3">
                  <IconTile icon={block.icon} />
                  <h3 className="text-xl font-semibold">{block.title}</h3>
                  <p className="text-base text-muted-foreground">{block.text}</p>
                  <code className="mt-auto w-fit rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {block.where}
                  </code>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="life-of-a-token"
          eyebrow="How it works"
          title="The life of a token"
          lead="Follow one token from the moment it exists to the day it travels home. Each chapter names the call or message that does the work."
        >
          <ol className="relative flex flex-col gap-4 before:absolute before:top-6 before:bottom-6 before:left-[23px] before:w-px before:bg-gradient-to-b before:from-primary/70 before:via-chain-hedera/50 before:to-border">
            {LIFE.map((chapter, i) => (
              <li key={chapter.title} className="relative flex gap-5">
                <span
                  className={cn(
                    "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border-2 bg-card text-primary",
                    chapter.upcoming ? "border-dashed border-border text-muted-foreground" : "border-primary/50",
                  )}
                >
                  <chapter.icon className="size-5" />
                </span>
                <Card className={cn("glass flex-1", chapter.upcoming && "border-dashed")}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold">
                        <span className="mr-2 font-mono text-sm text-muted-foreground">0{i + 1}</span>
                        {chapter.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        {chapter.chains.map(chainId => (
                          <ChainIcon key={chainId} chainId={chainId} size={24} />
                        ))}
                      </div>
                    </div>
                    <p className="text-base leading-relaxed text-muted-foreground">{chapter.text}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="h-7 px-3 font-mono text-xs">
                        {chapter.detail}
                      </Badge>
                      <Badge variant="outline" className="h-7 gap-1 px-3 text-xs">
                        <TimerIcon />
                        {chapter.time}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
          <Card className="glass border-primary/40">
            <CardContent className="flex flex-col gap-3">
              <span className="text-sm font-semibold tracking-wide text-primary uppercase">
                The books balance, live
              </span>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xl font-medium">
                <span className="flex items-center gap-1.5">
                  <ChainIcon chainId={HUB_CHAIN_ID} size={22} />
                  {amount(hub.hederaSupply)}
                </span>
                {spokes.map(spoke => (
                  <span key={spoke.chainId} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">+</span>
                    <ChainIcon chainId={spoke.chainId} size={22} />
                    {amount(spoke.outstanding)}
                  </span>
                ))}
                <span className="text-muted-foreground">=</span>
                <span className="text-gradient">
                  {amount(total)} {hub.symbol}
                </span>
              </p>
              <p className="text-base text-muted-foreground">
                What Hedera holds plus what the hub records for each chain is always everything ever issued, and no
                chain can hold more than its cap. The{" "}
                <a
                  href={repoFile("docs/architecture.md")}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  architecture document
                </a>{" "}
                covers the trust model and the failure modes.
              </p>
            </CardContent>
          </Card>
        </Section>

        <Section
          id="inside"
          eyebrow="Inside the box"
          title="Everything you get, and where it lives"
          lead="One repository with two packages, Foundry for the contracts and Next.js for the app, and the documentation next to them."
        >
          <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <Card className="gap-0 overflow-hidden bg-[oklch(0.18_0.025_258)] py-0 text-[oklch(0.93_0.01_230)] dark:bg-black/40">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5 text-sm text-white/60">
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="ml-2">my-fund/</span>
              </div>
              <ul className="flex flex-col gap-2.5 overflow-x-auto p-5 font-mono text-sm">
                {TREE.map(([path, note]) => (
                  <li key={path} className="flex flex-col gap-0.5">
                    <span className="whitespace-nowrap text-[oklch(0.82_0.12_190)]">{path}</span>
                    <span className="text-white/55">{note}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Make it yours</span>
              {RECIPES.map(([goal, where]) => (
                <div key={goal} className="rounded-xl border bg-card/60 p-4">
                  <div className="text-base font-semibold">{goal}</div>
                  <div className="text-sm text-muted-foreground">{where}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="ideas"
          eyebrow="Inspiration"
          title="What you can build"
          lead={
            <>
              The pattern underneath is general:{" "}
              <strong className="text-foreground">one set of rules on Hedera, tokens on any chain</strong>. Here are
              nine directions to take it, each with where to start in this template.
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {IDEAS.map(idea => (
              <Card key={idea.id} id={`idea-${idea.id}`} className="glass scroll-mt-28">
                <CardContent className="flex h-full flex-col gap-3">
                  <IconTile icon={idea.icon} />
                  <h3 className="text-xl font-semibold">{idea.title}</h3>
                  <p className="text-base text-muted-foreground">{idea.pitch}</p>
                  <p className="mt-auto rounded-lg bg-muted/60 p-3 text-sm">
                    <span className="font-semibold">Start from: </span>
                    <span className="text-muted-foreground">{idea.start}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {idea.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="h-6 px-2.5 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section
          id="hedera"
          eyebrow="Built on Hedera"
          title="Hedera does the heavy lifting"
          lead="Most of what makes a token trustworthy here is not custom code but Hedera itself."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map(service => (
              <div key={service.title} className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-5">
                <IconTile icon={service.icon} />
                <h3 className="text-lg font-semibold">{service.title}</h3>
                <p className="text-base text-muted-foreground">{service.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="good-to-know" eyebrow="Before you ship" title="Good to know">
          <div className="grid gap-4 md:grid-cols-2">
            {NOTES.map(note => (
              <Card key={note.title} className="glass">
                <CardContent className="flex gap-4">
                  <IconTile icon={note.icon} />
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold">{note.title}</h3>
                    <p className="text-base text-muted-foreground">{note.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card to-chain-hedera/15">
          <CardContent className="flex flex-col items-start gap-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-semibold tracking-tight">What will you tokenize?</h3>
              <p className="text-lg text-muted-foreground">One command gets you everything on this page.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="h-11 rounded-full px-5 text-base">
                <a href="#set-it-up">
                  Set it up
                  <ArrowRightIcon />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full bg-card/60 px-5 text-base">
                <a href={project.repository} target="_blank" rel="noreferrer">
                  <GitHubIcon className="size-4" />
                  GitHub
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <UserRoundIcon className="size-4" />
          Spotted something missing?
          <a
            href={`${project.repository}/issues`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Open an issue
          </a>
        </p>
      </article>
    </div>
  );
};
