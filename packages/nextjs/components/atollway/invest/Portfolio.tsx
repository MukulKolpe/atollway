"use client";

import { ArrowLeftRightIcon, WalletIcon } from "lucide-react";
import { Address, formatUnits } from "viem";
import { AnimatedNumber } from "~~/components/atollway/AnimatedNumber";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { StatusBadge } from "~~/components/atollway/StatusBadge";
import { Button } from "~~/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Skeleton } from "~~/components/ui/skeleton";
import { useHub } from "~~/hooks/atollway/useHub";
import { useInvestor } from "~~/hooks/atollway/useInvestor";
import { formatAmount } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getProfile, isHub } from "~~/utils/atollway/networks";

const NAV_DECIMALS = 8;

type PortfolioProps = {
  address: Address;
  /** Opens the transfer dialog with `chainId` as the source. */
  onMove?: (chainId: number) => void;
};

/**
 * The investor's shares on every chain, and what they are worth at the NAV.
 */
export const Portfolio = ({ address, onMove }: PortfolioProps) => {
  const { nav } = useHub();
  const { holdings, total, decimals, symbol, isLoading } = useInvestor(address);
  const totalNumber = total !== undefined ? Number(formatUnits(total, decimals)) : undefined;
  const navNumber = nav !== undefined ? Number(formatUnits(nav, NAV_DECIMALS)) : undefined;

  return (
    <Card className="glass">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <WalletIcon className="size-4" />
          Your shares
        </CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl font-semibold tracking-tight">
            <AnimatedNumber value={totalNumber} format={v => v.toLocaleString("en-US", { maximumFractionDigits: 4 })} />{" "}
            <span className="text-xl font-medium text-muted-foreground">{symbol}</span>
          </span>
          {totalNumber !== undefined && navNumber !== undefined && (
            <span className="text-base font-normal text-muted-foreground">
              ≈ {(totalNumber * navNumber).toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </span>
          )}
        </CardTitle>
        {onMove && (
          <CardAction>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={!total}
              aria-label="Move shares"
              onClick={() => onMove(HUB_CHAIN_ID)}
            >
              <ArrowLeftRightIcon />
              <span className="hidden sm:inline">Move shares</span>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1">
          {holdings.map(holding => {
            const share = total && holding.balance !== undefined ? Number((holding.balance * 1000n) / total) / 10 : 0;
            return (
              <li
                key={holding.chainId}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50"
              >
                <ChainIcon chainId={holding.chainId} size={34} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getProfile(holding.chainId).name}</span>
                    {isHub(holding.chainId) ? (
                      <span className="text-xs text-muted-foreground">Hub</span>
                    ) : (
                      holding.status !== "Approved" && (
                        <StatusBadge status={holding.status} className="h-4 text-[10px]" />
                      )
                    )}
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${share}%`, backgroundColor: getProfile(holding.chainId).color }}
                    />
                  </div>
                </div>
                <div className="w-28 text-right">
                  {isLoading && holding.balance === undefined ? (
                    <Skeleton className="ml-auto h-5 w-16" />
                  ) : (
                    <span className="font-medium tabular-nums">{formatAmount(holding.balance, decimals)}</span>
                  )}
                </div>
                {onMove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move shares from ${getProfile(holding.chainId).name}`}
                    disabled={!holding.balance}
                    onClick={() => onMove(holding.chainId)}
                  >
                    <ArrowLeftRightIcon />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
