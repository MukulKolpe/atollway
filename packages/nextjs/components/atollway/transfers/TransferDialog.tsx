"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRightIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { Address, Hex, formatUnits, parseEventLogs, parseUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { TransferTimeline } from "~~/components/atollway/transfers/TransferTimeline";
import { Alert, AlertDescription } from "~~/components/ui/alert";
import { Button } from "~~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~~/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~~/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~~/components/ui/select";
import { Spinner } from "~~/components/ui/spinner";
import { useHub } from "~~/hooks/atollway/useHub";
import { useInvestor } from "~~/hooks/atollway/useInvestor";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { useSentTransfers, useTransfers } from "~~/hooks/atollway/useTransfers";
import { BRIDGE_NAMES, hub, spokeGatewayAbi } from "~~/utils/atollway/contracts";
import { hubFeeValue, withMargin } from "~~/utils/atollway/fees";
import { formatAmount } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getChain, getProfile, isHub } from "~~/utils/atollway/networks";
import { Route, routeOf } from "~~/utils/atollway/routes";

const HBAR_DECIMALS = 8;

/** The chains whose finality a route waits for. Hedera finalizes in seconds, so only the others count. */
function slowChains(route: Route) {
  return route.hops
    .map(hop => hop.from)
    .filter(chainId => !isHub(chainId))
    .map(chainId => getProfile(chainId).name)
    .join(" and then ");
}

const ChainOption = ({ chainId, balance }: { chainId: number; balance?: string }) => (
  <span className="flex items-center gap-2">
    <ChainIcon chainId={chainId} size={20} />
    <span>{getProfile(chainId).name}</span>
    {balance !== undefined && <span className="text-xs text-muted-foreground">{balance}</span>}
  </span>
);

type TransferDialogProps = {
  address: Address;
  open: boolean;
  initialSource?: number;
  onOpenChange: (open: boolean) => void;
};

/**
 * Moves shares between Hedera and a spoke: pick a route and an amount, see the fee and the usual wait, sign
 * once, then watch the transfer travel.
 */
export const TransferDialog = ({ address, open, initialSource, onOpenChange }: TransferDialogProps) => {
  const { decimals, symbol, paused: hubPaused } = useHub();
  const { spokes } = useSpokes();
  const investor = useInvestor(address);
  const { transfers } = useTransfers(address);
  const remember = useSentTransfers(state => state.add);
  const tx = useTransaction();

  const [source, setSource] = useState<number>(HUB_CHAIN_ID);
  const [destination, setDestination] = useState<number>();
  const [amount, setAmount] = useState("");
  const [sentId, setSentId] = useState<Hex>();

  useEffect(() => {
    if (!open) return;
    const start = initialSource ?? HUB_CHAIN_ID;
    setSource(start);
    setDestination(isHub(start) ? spokes[0]?.chainId : HUB_CHAIN_ID);
    setAmount("");
    setSentId(undefined);
    tx.reset();
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSource]);

  const direction = isHub(source) ? "toSpoke" : "toHub";
  const spokeId = direction === "toSpoke" ? destination : source;
  const spoke = spokes.find(item => item.chainId === spokeId);
  const route = spokeId !== undefined ? routeOf(spokeId, direction) : undefined;
  const holding = (chainId: number) => investor.holdings.find(item => item.chainId === chainId);
  const available = holding(source)?.balance;

  const hubFee = useReadContract({
    ...hub,
    functionName: "quoteSendToSpoke",
    args: [BigInt(spokeId ?? 0)],
    query: { enabled: open && direction === "toSpoke" && spokeId !== undefined, refetchInterval: 20_000 },
  });
  const spokeFee = useReadContract({
    address: spoke?.gateway,
    abi: spokeGatewayAbi,
    chainId: spokeId,
    functionName: "quoteSendToHub",
    query: { enabled: open && direction === "toHub" && Boolean(spoke?.gateway), refetchInterval: 20_000 },
  });
  const gas = useBalance({ address, chainId: source, query: { enabled: open } });

  // On Hedera the hub quotes in tinybars, while wallets send 18 decimals. Spokes quote in wei.
  const quoted = direction === "toSpoke" ? hubFee.data : spokeFee.data;
  const value = quoted === undefined ? undefined : direction === "toSpoke" ? hubFeeValue(quoted) : withMargin(quoted);
  const nativeSymbol = getChain(source)?.nativeCurrency.symbol ?? "";
  const feeText =
    quoted === undefined
      ? "…"
      : `${Number(formatUnits(quoted, direction === "toSpoke" ? HBAR_DECIMALS : 18)).toLocaleString("en-US", { maximumSignificantDigits: 3 })} ${nativeSymbol}`;

  const units = amount && Number(amount) > 0 ? parseUnits(amount, decimals) : 0n;
  const sourceStatus = holding(source)?.status;
  const destinationStatus = destination !== undefined ? holding(destination)?.status : undefined;
  const sourcePaused = isHub(source) ? hubPaused : spoke?.hubPaused || spoke?.guardianPaused;

  const blocker = !units
    ? "Enter an amount"
    : available !== undefined && units > available
      ? `Not enough ${symbol} on ${getProfile(source).name}`
      : sourceStatus !== "Approved"
        ? `Not approved on ${getProfile(source).name}`
        : sourcePaused
          ? `${getProfile(source).name} is paused`
          : direction === "toHub" && investor.status !== "Approved"
            ? "Your approval on Hedera is not active"
            : direction === "toSpoke" && spoke?.cap !== undefined && (spoke.outstanding ?? 0n) + units > spoke.cap
              ? "Over this spoke's supply cap"
              : value !== undefined && gas.data && gas.data.value < value
                ? `Not enough ${nativeSymbol} for the bridge fee`
                : value === undefined
                  ? "Getting the bridge fee…"
                  : undefined;

  const warning =
    direction === "toSpoke" && destination !== undefined && destinationStatus !== "Approved"
      ? `Your approval has not reached ${getProfile(destination).name} yet. The shares will arrive, but you cannot move them there until it does. Ask the issuer to resend approvals.`
      : undefined;

  const send = async () => {
    if (spokeId === undefined || value === undefined || !spoke) return;
    const label = `Move ${amount} ${symbol} to ${getProfile(direction === "toSpoke" ? spokeId : HUB_CHAIN_ID).name}`;
    const receipt =
      direction === "toSpoke"
        ? await tx.send({ ...hub, functionName: "sendToSpoke", args: [BigInt(spokeId), units], value, label })
        : await tx.send({
            chainId: spokeId,
            address: spoke.gateway!,
            abi: spokeGatewayAbi,
            functionName: "sendToHub",
            args: [units],
            value,
            label,
          });
    if (!receipt) return;

    const [event] =
      direction === "toSpoke"
        ? parseEventLogs({ abi: hub.abi, logs: receipt.logs, eventName: "SentToSpoke" })
        : parseEventLogs({ abi: spokeGatewayAbi, logs: receipt.logs, eventName: "SentToHub" });
    const transferId = event?.args.transferId;
    if (!transferId) return;
    remember({
      id: transferId,
      investor: address,
      direction,
      spokeId,
      sourceChainId: source,
      destinationChainId: direction === "toSpoke" ? spokeId : HUB_CHAIN_ID,
      amount: units,
      sourceTx: receipt.transactionHash,
      time: new Date(),
    });
    setSentId(transferId);
    investor.refetch();
  };

  const sent = sentId ? transfers.find(item => item.id === sentId) : undefined;
  const chains = [HUB_CHAIN_ID, ...spokes.map(item => item.chainId)];
  const balanceText = (chainId: number) => {
    const balance = holding(chainId)?.balance;
    return balance !== undefined ? formatAmount(balance, decimals) : undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CircleCheckIcon className="size-5 text-success" />
                On its way
              </DialogTitle>
              <DialogDescription>
                {formatAmount(sent.amount, decimals)} {symbol} left {getProfile(sent.sourceChainId).name}. It usually
                reaches {getProfile(sent.destinationChainId).name} in about {route?.minutes} min. You can close this
                window and follow it under Transfers.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border bg-muted/30 p-4">
              <TransferTimeline transfer={sent} />
            </div>
            <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Move shares</DialogTitle>
              <DialogDescription>
                Shares travel between Hedera and each spoke. To reach another spoke, bring them to Hedera first.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">From</span>
                <Select
                  value={String(source)}
                  onValueChange={next => {
                    const chainId = Number(next);
                    setSource(chainId);
                    setDestination(isHub(chainId) ? spokes[0]?.chainId : HUB_CHAIN_ID);
                  }}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chains.map(chainId => (
                      <SelectItem key={chainId} value={String(chainId)}>
                        <ChainOption chainId={chainId} balance={balanceText(chainId)} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="mb-1.5 rounded-full"
                aria-label="Swap direction"
                disabled={destination === undefined}
                onClick={() => {
                  if (destination === undefined) return;
                  setSource(destination);
                  setDestination(source);
                }}
              >
                <ArrowLeftRightIcon />
              </Button>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">To</span>
                <Select
                  value={destination !== undefined ? String(destination) : undefined}
                  onValueChange={next => setDestination(Number(next))}
                  disabled={!isHub(source)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Choose a chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isHub(source) ? spokes.map(item => item.chainId) : [HUB_CHAIN_ID]).map(chainId => (
                      <SelectItem key={chainId} value={String(chainId)}>
                        <ChainOption chainId={chainId} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Amount</span>
                <span>
                  Available {formatAmount(available, decimals)} {symbol}
                </span>
              </div>
              <InputGroup className="h-12 rounded-xl">
                <InputGroupInput
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  aria-label="Shares to move"
                  className="text-xl font-semibold tabular-nums"
                  onChange={event => {
                    const next = event.target.value.replace(",", ".");
                    if (new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`).test(next)) setAmount(next);
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="secondary"
                    disabled={!available}
                    onClick={() => available !== undefined && setAmount(formatUnits(available, decimals))}
                  >
                    Max
                  </InputGroupButton>
                  <span className="pr-1">{symbol}</span>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <dt className="text-muted-foreground">Bridge</dt>
              <dd className="text-right">
                {route?.bridge ? BRIDGE_NAMES[route.bridge] : "–"}
                {route && route.hops.length > 1 && `, relayed on ${getProfile(route.hops[0].to).name}`}
              </dd>
              <dt className="text-muted-foreground">Bridge fee</dt>
              <dd className="text-right">
                {feeText}
                <span className="block text-xs text-muted-foreground">
                  Paid on {getProfile(source).name}. Unused fee is refunded.
                </span>
              </dd>
              <dt className="text-muted-foreground">Usually arrives in</dt>
              <dd className="text-right">about {route?.minutes ?? "–"} min</dd>
            </dl>

            {warning && (
              <Alert>
                <TriangleAlertIcon />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            )}
            {!warning && route && route.minutes >= 10 && (
              <Alert>
                <InfoIcon />
                <AlertDescription>
                  Most of the wait is the bridge waiting for {slowChains(route)} to finalize. Your shares are safe
                  meanwhile: the hub&apos;s ledger on Hedera counts them until they land.
                </AlertDescription>
              </Alert>
            )}

            <Button
              size="lg"
              className="h-11 w-full rounded-xl text-base"
              disabled={Boolean(blocker) || tx.isBusy}
              onClick={send}
            >
              {tx.isBusy && <Spinner />}
              {tx.status === "switching"
                ? `Switch to ${getProfile(source).name} in your wallet`
                : tx.isBusy
                  ? "Confirm in your wallet"
                  : (blocker ?? `Move ${amount} ${symbol} to ${getProfile(destination ?? HUB_CHAIN_ID).name}`)}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
