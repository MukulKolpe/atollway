"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  CirclePauseIcon,
  CoinsIcon,
  ExternalLinkIcon,
  PlugIcon,
  TagIcon,
} from "lucide-react";
import { formatUnits } from "viem";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~~/components/ui/empty";
import { Skeleton } from "~~/components/ui/skeleton";
import { useHub } from "~~/hooks/atollway/useHub";
import { HubActivity, useHubActivity } from "~~/hooks/atollway/useHubActivity";
import { formatAmount, shortAddress, timeAgo } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getProfile, txUrl } from "~~/utils/atollway/networks";

const HBAR_DECIMALS = 8;

function describe(event: HubActivity, decimals: number, symbol: string) {
  const shares = (amount: bigint) => `${formatAmount(amount, decimals)} ${symbol}`;
  switch (event.kind) {
    case "subscribed":
      return {
        icon: <CoinsIcon />,
        text: `${shortAddress(event.investor)} bought ${shares(event.shares)} for ${Number(formatUnits(event.hbarAmount, HBAR_DECIMALS)).toLocaleString("en-US")} HBAR`,
      };
    case "sentToSpoke":
      return {
        icon: <ArrowUpRightIcon />,
        chainId: event.spokeId,
        text: `${shortAddress(event.investor)} sent ${shares(event.amount)} to ${getProfile(event.spokeId).name}`,
      };
    case "releasedFromSpoke":
      return {
        icon: <ArrowDownLeftIcon />,
        chainId: event.spokeId,
        text: `${shares(event.amount)} came back from ${getProfile(event.spokeId).name} to ${shortAddress(event.investor)}`,
      };
    case "investorStatus":
      return {
        icon: <BadgeCheckIcon />,
        text: `${shortAddress(event.investor)} is now ${event.status.toLowerCase()}`,
      };
    case "spokeAdded":
      return {
        icon: <PlugIcon />,
        chainId: event.spokeId,
        text: `${getProfile(event.spokeId).name} joined as a spoke`,
      };
    case "navUpdated":
      return {
        icon: <TagIcon />,
        text: `NAV set to ${Number(formatUnits(event.nav, 8)).toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
      };
    case "paused":
      return {
        icon: <CirclePauseIcon />,
        text: event.paused ? "The issuer paused the asset" : "The issuer resumed the asset",
      };
  }
}

/**
 * The hub's latest events, from the Hedera mirror node.
 */
export const ActivityFeed = ({ limit = 8 }: { limit?: number }) => {
  const { data, isLoading } = useHubActivity();
  const { decimals, symbol } = useHub();
  const events = data?.slice(0, limit) ?? [];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Latest activity</CardTitle>
        <CardDescription>What the hub recorded on Hedera, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>Nothing yet</EmptyTitle>
              <EmptyDescription>Subscriptions and transfers show up here as they happen.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col">
            {events.map(event => {
              const { icon, text, chainId } = describe(event, decimals, symbol);
              return (
                <li
                  key={event.id}
                  className="group flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
                >
                  <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-4">
                    {icon}
                    {chainId !== undefined && (
                      <ChainIcon
                        chainId={chainId}
                        size={14}
                        className="absolute -right-0.5 -bottom-0.5 ring-2 ring-card"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{text}</span>
                  <a
                    href={txUrl(HUB_CHAIN_ID, event.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {timeAgo(event.time)}
                    <ExternalLinkIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
