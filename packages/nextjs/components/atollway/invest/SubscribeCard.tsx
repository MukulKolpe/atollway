"use client";

import { useState } from "react";
import { ArrowDownIcon, CoinsIcon } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";
import { Address, formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~~/components/ui/input-group";
import { Skeleton } from "~~/components/ui/skeleton";
import { Spinner } from "~~/components/ui/spinner";
import { useHub } from "~~/hooks/atollway/useHub";
import { useInvestor } from "~~/hooks/atollway/useInvestor";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { hub } from "~~/utils/atollway/contracts";
import { formatAmount, formatUsd } from "~~/utils/atollway/format";

const HBAR_DECIMALS = 8;
const NAV_DECIMALS = 8;
/** Accepts at most a 1% worse price than quoted. */
const SLIPPAGE_BPS = 100n;
/** HBAR kept back for transaction fees when you press Max. */
const FEE_RESERVE = parseEther("5");
const PRESETS = ["10", "50", "100"];

/**
 * Buys new shares with HBAR at the issuer's NAV, priced by Chainlink.
 */
export const SubscribeCard = ({ address }: { address: Address }) => {
  const hubState = useHub();
  const investor = useInvestor(address);
  const tx = useTransaction();
  const [amount, setAmount] = useState("");
  const [debounced] = useDebounceValue(amount, 300);
  const { decimals, symbol } = hubState;

  // Inside the Hedera EVM, value is in tinybars (8 decimals); wallets send 18 decimals and the relay converts.
  const tinybars = debounced && Number(debounced) > 0 ? parseUnits(debounced, HBAR_DECIMALS) : undefined;
  const quote = useReadContract({
    ...hub,
    functionName: "quoteSubscription",
    args: [tinybars ?? 0n],
    query: { enabled: tinybars !== undefined, refetchInterval: 15_000 },
  });
  const shares = tinybars !== undefined ? quote.data : undefined;
  const minShares = shares !== undefined ? (shares * (10_000n - SLIPPAGE_BPS)) / 10_000n : undefined;
  const usdValue =
    shares !== undefined && hubState.nav !== undefined ? (shares * hubState.nav) / 10n ** BigInt(decimals) : undefined;
  const hbarPerShare =
    hubState.nav !== undefined && hubState.hbarUsd
      ? Number(formatUnits(hubState.nav, NAV_DECIMALS)) / Number(formatUnits(hubState.hbarUsd, hubState.priceDecimals))
      : undefined;

  const value = amount && Number(amount) > 0 ? parseEther(amount) : 0n;
  const balance = investor.hbarBalance;

  const blocker =
    investor.status !== "Approved"
      ? "Get approved first"
      : hubState.paused
        ? "Paused by the issuer"
        : hubState.priceStale
          ? "Waiting for a fresh price"
          : hubState.nav === 0n
            ? "Subscriptions are closed"
            : !value
              ? "Enter an amount"
              : balance !== undefined && value > balance
                ? "Not enough HBAR"
                : undefined;

  const subscribe = async () => {
    if (minShares === undefined) return;
    const receipt = await tx.send({
      ...hub,
      functionName: "subscribe",
      args: [minShares],
      value,
      label: `Buy ${formatAmount(shares, decimals)} ${symbol}`,
    });
    if (receipt) {
      setAmount("");
      await investor.refetch();
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CoinsIcon className="size-5 text-primary" />
          Subscribe
        </CardTitle>
        <CardDescription>Pay in HBAR at the NAV. Shares arrive on Hedera right away.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>You pay</span>
            <span>
              Balance{" "}
              {balance !== undefined
                ? Number(formatEther(balance)).toLocaleString("en-US", { maximumFractionDigits: 2 })
                : "–"}{" "}
              HBAR
            </span>
          </div>
          <InputGroup className="h-14 rounded-xl bg-background/60">
            <InputGroupInput
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={event => {
                const next = event.target.value.replace(",", ".");
                if (/^\d*\.?\d{0,8}$/.test(next)) setAmount(next);
              }}
              className="text-2xl font-semibold tabular-nums"
              aria-label="HBAR to pay"
            />
            <InputGroupAddon align="inline-end" className="text-base">
              ℏ HBAR
            </InputGroupAddon>
          </InputGroup>
          <div className="flex gap-2">
            {PRESETS.map(preset => (
              <Button
                key={preset}
                variant="secondary"
                size="xs"
                className="rounded-full"
                onClick={() => setAmount(preset)}
              >
                {preset} HBAR
              </Button>
            ))}
            <Button
              variant="secondary"
              size="xs"
              className="rounded-full"
              disabled={!balance || balance <= FEE_RESERVE}
              onClick={() => balance && setAmount(Number(formatEther(balance - FEE_RESERVE)).toFixed(2))}
            >
              Max
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <span className="flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground">
            <ArrowDownIcon className="size-4" />
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 p-4">
          <span className="text-xs text-muted-foreground">You receive about</span>
          {quote.isFetching && shares === undefined && tinybars !== undefined ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <span className="text-2xl font-semibold tabular-nums">
              {shares !== undefined ? formatAmount(shares, decimals) : "0"}{" "}
              <span className="text-base font-medium text-muted-foreground">{symbol}</span>
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {usdValue !== undefined ? `Worth ${formatUsd(usdValue, NAV_DECIMALS)} at the NAV` : "Priced at the NAV"}
            {hbarPerShare ? ` · 1 ${symbol} ≈ ${hbarPerShare.toFixed(2)} HBAR` : ""}
          </span>
        </div>

        <Button
          size="lg"
          className="h-11 rounded-xl text-base"
          disabled={Boolean(blocker) || tx.isBusy}
          onClick={subscribe}
        >
          {tx.isBusy && <Spinner />}
          {tx.isBusy ? "Confirm in your wallet" : (blocker ?? "Subscribe")}
        </Button>
        {minShares !== undefined && !blocker && (
          <p className="text-center text-xs text-muted-foreground">
            You get at least {formatAmount(minShares, decimals)} {symbol}. If the price moves more than 1%, the purchase
            fails and your HBAR stays with you.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
