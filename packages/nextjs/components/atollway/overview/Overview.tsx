"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { zeroAddress } from "viem";
import atollwayConfig from "~~/atollway.config";
import { CopyCommand } from "~~/components/atollway/CopyCommand";
import { ActivityFeed } from "~~/components/atollway/overview/ActivityFeed";
import { HowItWorks } from "~~/components/atollway/overview/HowItWorks";
import { NetworkMap } from "~~/components/atollway/overview/NetworkMap";
import { StatsGrid } from "~~/components/atollway/overview/StatsGrid";
import { SupplyBreakdown } from "~~/components/atollway/overview/SupplyBreakdown";
import { TemplateShowcase } from "~~/components/atollway/overview/TemplateShowcase";
import { Alert, AlertDescription, AlertTitle } from "~~/components/ui/alert";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card } from "~~/components/ui/card";
import { useSupply } from "~~/hooks/atollway/useSupply";
import { BRIDGE_NAMES } from "~~/utils/atollway/contracts";

const LEGEND = [
  { name: BRIDGE_NAMES.axelar, color: "var(--chart-1)" },
  { name: BRIDGE_NAMES.ccip, color: "var(--chart-3)" },
];

/**
 * The landing page: the network at a glance, live from every chain.
 */
export const Overview = () => {
  const [active, setActive] = useState<number>();
  const { hub, spokes, total } = useSupply();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 pt-10 pb-20 sm:px-6 lg:pt-16">
      {hub.token === zeroAddress && (
        <Alert>
          <SparklesIcon />
          <AlertTitle>Your hub is deployed. Create its asset next.</AlertTitle>
          <AlertDescription>
            Open the{" "}
            <Link href="/issuer" className="font-medium text-foreground underline underline-offset-4">
              issuer console
            </Link>{" "}
            with the wallet that deployed the hub to create the token and set its NAV.
          </AlertDescription>
        </Alert>
      )}
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col items-start gap-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="h-8 gap-2 rounded-full bg-card/60 px-3.5 text-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Live on Hedera testnet
            </Badge>
            <Badge asChild variant="outline" className="h-8 gap-1.5 rounded-full bg-card/60 px-3.5 text-sm">
              <Link href="/docs">
                <SparklesIcon className="text-primary" />A Scaffold-HBAR template
              </Link>
            </Badge>
          </div>
          <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Issue on Hedera. <span className="text-gradient">Hold anywhere.</span>
          </h1>
          <p className="max-w-xl text-xl text-muted-foreground text-pretty">
            Atollway issues a tokenized fund on Hedera and mirrors it to other chains. Approvals, freezes and supply
            caps follow the shares wherever they go.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 rounded-full px-5 text-base">
              <Link href="/invest">
                Start investing
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-5 text-base">
              <Link href="/issuer">Open the issuer console</Link>
            </Button>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-2">
            <span className="text-sm text-muted-foreground">Or start your own from this template:</span>
            <CopyCommand command={`npm create scaffold-hbar@latest -- --template ${atollwayConfig.project.template}`} />
          </div>
        </div>
        <Card className="glass relative overflow-hidden p-2 sm:p-4">
          <div aria-hidden className="absolute inset-0 bg-grid" />
          <NetworkMap
            className="relative"
            spokes={spokes}
            hederaSupply={hub.hederaSupply}
            totalSupply={total}
            decimals={hub.decimals}
            symbol={hub.symbol}
            active={active}
            onActiveChange={setActive}
          />
          <div className="relative flex flex-wrap items-center justify-center gap-4 pb-2 text-sm text-muted-foreground">
            {LEGEND.map(item => (
              <span key={item.name} className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
            ))}
            <span>Rings show each chain&apos;s share of supply</span>
          </div>
        </Card>
      </section>

      <StatsGrid />

      <section className="grid gap-6 lg:grid-cols-2">
        <SupplyBreakdown active={active} onActiveChange={setActive} />
        <ActivityFeed />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <HowItWorks />
      </section>

      <TemplateShowcase />
    </div>
  );
};
