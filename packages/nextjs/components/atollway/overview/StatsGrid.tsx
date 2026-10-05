"use client";

import { ArrowLeftRightIcon, CircleDollarSignIcon, LayersIcon, TrendingUpIcon } from "lucide-react";
import { formatUnits } from "viem";
import { AnimatedNumber } from "~~/components/atollway/AnimatedNumber";
import { Card, CardContent } from "~~/components/ui/card";
import { Skeleton } from "~~/components/ui/skeleton";
import { useSupply } from "~~/hooks/atollway/useSupply";
import { cn } from "~~/lib/utils";
import { timeAgo } from "~~/utils/atollway/format";

const NAV_DECIMALS = 8;

type StatProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
  loading?: boolean;
  tone?: "default" | "warning";
};

const Stat = ({ icon, label, value, detail, loading, tone = "default" }: StatProps) => (
  <Card className="glass gap-3">
    <CardContent className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
          {icon}
        </span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      )}
      <div className={cn("text-xs text-muted-foreground", tone === "warning" && "text-warning")}>{detail}</div>
    </CardContent>
  </Card>
);

const number = (value: bigint | undefined, decimals: number) =>
  value === undefined ? undefined : Number(formatUnits(value, decimals));

/**
 * The headline numbers: total supply, NAV, the HBAR price and what is on a bridge right now.
 */
export const StatsGrid = () => {
  const { hub, spokes, total, inTransit, isLoading } = useSupply();
  const { decimals, symbol } = hub;
  const hbarPerShare =
    hub.nav !== undefined && hub.hbarUsd
      ? Number(hub.nav) / 10 ** NAV_DECIMALS / Number(formatUnits(hub.hbarUsd, hub.priceDecimals))
      : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        icon={<LayersIcon />}
        label="Total supply"
        loading={isLoading && total === undefined}
        value={
          <>
            <AnimatedNumber
              value={number(total, decimals)}
              format={v => v.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            />{" "}
            <span className="text-base font-medium text-muted-foreground">{symbol}</span>
          </>
        }
        detail={`Across Hedera and ${spokes.length} spoke${spokes.length === 1 ? "" : "s"}`}
      />
      <Stat
        icon={<CircleDollarSignIcon />}
        label="Net asset value"
        loading={hub.nav === undefined}
        value={
          <AnimatedNumber
            value={number(hub.nav, NAV_DECIMALS)}
            format={v => v.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          />
        }
        detail={
          hbarPerShare ? `Per share, about ${hbarPerShare.toFixed(2)} HBAR today` : "Per share, set by the issuer"
        }
      />
      <Stat
        icon={<TrendingUpIcon />}
        label="HBAR price"
        loading={hub.hbarUsd === undefined}
        tone={hub.priceStale ? "warning" : "default"}
        value={
          <AnimatedNumber
            value={number(hub.hbarUsd, hub.priceDecimals)}
            format={v => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 })}
          />
        }
        detail={
          hub.priceStale
            ? "Chainlink price is too old, so subscriptions pause"
            : `Chainlink HBAR/USD, updated ${hub.priceUpdatedAt ? timeAgo(hub.priceUpdatedAt) : "–"}`
        }
      />
      <Stat
        icon={<ArrowLeftRightIcon />}
        label="On a bridge now"
        loading={inTransit === undefined}
        value={
          <>
            <AnimatedNumber
              value={number(inTransit, decimals)}
              format={v => v.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            />{" "}
            <span className="text-base font-medium text-muted-foreground">{symbol}</span>
          </>
        }
        detail={inTransit ? "Lands when the bridge delivers" : "Every transfer has landed"}
      />
    </div>
  );
};
