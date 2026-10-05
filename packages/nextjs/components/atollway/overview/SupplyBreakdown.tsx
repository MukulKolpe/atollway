"use client";

import { ArrowLeftRightIcon, ScaleIcon } from "lucide-react";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { Badge } from "~~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Skeleton } from "~~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "~~/components/ui/tooltip";
import { useSupply } from "~~/hooks/atollway/useSupply";
import { cn } from "~~/lib/utils";
import { BRIDGE_NAMES } from "~~/utils/atollway/contracts";
import { formatAmount } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getProfile } from "~~/utils/atollway/networks";

type Row = {
  chainId: number;
  amount?: bigint;
  route: string;
  detail?: string;
  paused?: boolean;
};

type SupplyBreakdownProps = {
  active?: number;
  onActiveChange?: (chainId: number | undefined) => void;
};

/**
 * One bar split by chain, and a row per chain with its bridge, holdings and cap.
 */
export const SupplyBreakdown = ({ active, onActiveChange }: SupplyBreakdownProps) => {
  const { hub, spokes, total, inTransit, isLoading } = useSupply();
  const { decimals, symbol } = hub;

  const rows: Row[] = [
    { chainId: HUB_CHAIN_ID, amount: hub.hederaSupply, route: "Hub, issues the asset", paused: hub.paused },
    ...spokes.map(spoke => {
      const bridge = spoke.bridge ? BRIDGE_NAMES[spoke.bridge] : "Unknown bridge";
      const relay = spoke.route?.relayChainId;
      return {
        chainId: spoke.chainId,
        amount: spoke.supply ?? spoke.outstanding,
        route: relay ? `${bridge}, relayed on ${getProfile(relay).name}` : bridge,
        detail: spoke.cap !== undefined ? `Cap ${formatAmount(spoke.cap, decimals, 0)}` : undefined,
        paused: spoke.hubPaused || spoke.guardianPaused,
      };
    }),
  ];

  const percent = (amount?: bigint) =>
    amount !== undefined && total ? Number((amount * 10_000n) / total) / 100 : undefined;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Where the shares are</CardTitle>
        <CardDescription>
          Hedera holds what has not moved. Each spoke holds what its bridge has delivered, within its cap.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {rows.map(row => (
            <Tooltip key={row.chainId}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full",
                    active !== undefined && active !== row.chainId && "opacity-30",
                  )}
                  style={{ width: `${percent(row.amount) ?? 0}%`, backgroundColor: getProfile(row.chainId).color }}
                  onMouseEnter={() => onActiveChange?.(row.chainId)}
                  onMouseLeave={() => onActiveChange?.(undefined)}
                />
              </TooltipTrigger>
              <TooltipContent>
                {getProfile(row.chainId).name}: {percent(row.amount)?.toFixed(1)}%
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <ul className="flex flex-col">
          {rows.map(row => (
            <li
              key={row.chainId}
              onMouseEnter={() => onActiveChange?.(row.chainId)}
              onMouseLeave={() => onActiveChange?.(undefined)}
              className={cn(
                "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors",
                active === row.chainId && "bg-muted/70",
              )}
            >
              <ChainIcon chainId={row.chainId} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 font-medium">
                  {getProfile(row.chainId).name}
                  {row.paused && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                      Paused
                    </Badge>
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {row.route}
                  {row.detail && ` · ${row.detail}`}
                </span>
              </div>
              <div className="flex flex-col items-end">
                {isLoading && row.amount === undefined ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <span className="font-medium tabular-nums">
                    {formatAmount(row.amount, decimals, 2)} <span className="text-muted-foreground">{symbol}</span>
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {percent(row.amount) !== undefined ? `${percent(row.amount)!.toFixed(1)}%` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {total !== undefined && inTransit !== undefined && (
          <div className="mt-auto flex items-start gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
            {inTransit === 0n ? (
              <ScaleIcon className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <ArrowLeftRightIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <p className="text-muted-foreground">
              {inTransit === 0n ? (
                <>
                  <span className="font-medium text-foreground">The books balance.</span> Every spoke holds exactly what
                  the hub&apos;s ledger says, and together with Hedera that is the {formatAmount(total, decimals)}{" "}
                  {symbol} issued.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {formatAmount(inTransit, decimals)} {symbol} is on a bridge.
                  </span>{" "}
                  The hub&apos;s ledger counts it until it lands, so the total stays {formatAmount(total, decimals)}{" "}
                  {symbol}.
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
