"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, ChevronDownIcon, CircleCheckIcon } from "lucide-react";
import { Address } from "viem";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { TransferTimeline } from "~~/components/atollway/transfers/TransferTimeline";
import { Badge } from "~~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~~/components/ui/empty";
import { Progress } from "~~/components/ui/progress";
import { Skeleton } from "~~/components/ui/skeleton";
import { useHub } from "~~/hooks/atollway/useHub";
import { TrackedTransfer, useTransfers } from "~~/hooks/atollway/useTransfers";
import { cn } from "~~/lib/utils";
import { formatAmount, formatDuration, timeAgo } from "~~/utils/atollway/format";
import { getProfile } from "~~/utils/atollway/networks";
import { routeOf } from "~~/utils/atollway/routes";

/** Re-renders every few seconds, for elapsed times. */
function useNow(intervalMs = 5_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const TransferRow = ({
  transfer,
  decimals,
  symbol,
}: {
  transfer: TrackedTransfer;
  decimals: number;
  symbol: string;
}) => {
  const [open, setOpen] = useState(transfer.delivered === false);
  const now = useNow();
  const route = routeOf(transfer.spokeId, transfer.direction);
  const elapsed = (now - transfer.time.getTime()) / 1000;
  const expected = route.minutes * 60;
  const inFlight = transfer.delivered === false;

  return (
    <li className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center gap-3 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center -space-x-1.5">
          <ChainIcon chainId={transfer.sourceChainId} size={26} className="ring-2 ring-card" />
          <ChainIcon chainId={transfer.destinationChainId} size={26} className="ring-2 ring-card" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">
            {getProfile(transfer.sourceChainId).name}
            <ArrowRightIcon className="mx-1 inline size-3.5 align-[-2px] text-muted-foreground" />
            {getProfile(transfer.destinationChainId).name}
          </span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(transfer.time, now)}
            <span className="sm:hidden">
              {" "}
              · {formatAmount(transfer.amount, decimals)} {symbol}
            </span>
          </span>
        </span>
        <span className="hidden text-sm font-medium tabular-nums sm:inline">
          {formatAmount(transfer.amount, decimals)} <span className="text-muted-foreground">{symbol}</span>
        </span>
        {transfer.delivered ? (
          <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
            <CircleCheckIcon />
            Arrived
          </Badge>
        ) : transfer.delivered === false ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            In transit
          </Badge>
        ) : (
          <Skeleton className="h-5 w-16 rounded-full" />
        )}
        <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]")}>
        <div className="flex flex-col gap-4 overflow-hidden pl-1">
          {inFlight && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
              <Progress value={Math.min(95, (elapsed / expected) * 100)} className="h-1.5" />
              <span className="text-xs text-muted-foreground">
                {elapsed < expected
                  ? `About ${formatDuration(expected - elapsed)} left. This route usually takes ${route.minutes} min.`
                  : `Taking longer than the usual ${route.minutes} min. Bridges wait for the source chain to finalize, which can vary.`}
              </span>
            </div>
          )}
          {open && <TransferTimeline transfer={transfer} />}
        </div>
      </div>
    </li>
  );
};

/**
 * The investor's transfers between chains, with live progress for the ones still on a bridge.
 */
export const TransferList = ({ address }: { address: Address }) => {
  const { transfers, isLoading } = useTransfers(address);
  const { decimals, symbol } = useHub();
  const inFlight = transfers.filter(transfer => transfer.delivered === false).length;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Transfers
          {inFlight > 0 && <Badge className="rounded-full">{inFlight} in transit</Badge>}
        </CardTitle>
        <CardDescription>Moves between chains, tracked until they arrive. Open one to see each step.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && transfers.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : transfers.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>No transfers yet</EmptyTitle>
              <EmptyDescription>Move shares to another chain from your holdings above.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col">
            {transfers.slice(0, 10).map(transfer => (
              <TransferRow key={transfer.id} transfer={transfer} decimals={decimals} symbol={symbol} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
