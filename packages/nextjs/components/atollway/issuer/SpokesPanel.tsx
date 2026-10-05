"use client";

import { useState } from "react";
import { RefreshCwIcon, SlidersHorizontalIcon } from "lucide-react";
import { Address, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { StatusBadge } from "~~/components/atollway/StatusBadge";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Checkbox } from "~~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~~/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~~/components/ui/input-group";
import { Progress } from "~~/components/ui/progress";
import { Spinner } from "~~/components/ui/spinner";
import { useHub } from "~~/hooks/atollway/useHub";
import { isInSync, useInvestorDirectory } from "~~/hooks/atollway/useInvestorDirectory";
import { useIssuer } from "~~/hooks/atollway/useIssuer";
import { Spoke, useSpokes } from "~~/hooks/atollway/useSpokes";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { BRIDGE_NAMES, hub } from "~~/utils/atollway/contracts";
import { formatHbar, hubFeeValue } from "~~/utils/atollway/fees";
import { formatAmount, shortAddress } from "~~/utils/atollway/format";
import { contractUrl, getProfile } from "~~/utils/atollway/networks";

const CapDialog = ({ spoke, onClose }: { spoke: Spoke; onClose: () => void }) => {
  const { decimals, symbol } = useHub();
  const tx = useTransaction();
  const [cap, setCap] = useState("");
  const units = cap ? parseUnits(cap, decimals) : undefined;
  const belowOutstanding = units !== undefined && spoke.outstanding !== undefined && units < spoke.outstanding;

  const save = async () => {
    if (units === undefined) return;
    const receipt = await tx.send({
      ...hub,
      functionName: "setSpokeCap",
      args: [BigInt(spoke.chainId), units],
      label: `Set the ${getProfile(spoke.chainId).name} cap to ${cap} ${symbol}`,
    });
    if (receipt) onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && !tx.isBusy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change the {getProfile(spoke.chainId).name} cap</DialogTitle>
          <DialogDescription>
            The most this spoke may hold. Transfers that would go over it are refused on Hedera, so a bridge or spoke
            problem cannot create more than the cap.
          </DialogDescription>
        </DialogHeader>
        <InputGroup className="h-11">
          <InputGroupInput
            inputMode="decimal"
            placeholder={formatAmount(spoke.cap, decimals, 0)}
            value={cap}
            onChange={event => /^\d*\.?\d*$/.test(event.target.value) && setCap(event.target.value)}
            aria-label="New cap"
          />
          <InputGroupAddon align="inline-end">{symbol}</InputGroupAddon>
        </InputGroup>
        {belowOutstanding && (
          <p className="text-sm text-warning">
            The spoke already holds {formatAmount(spoke.outstanding, decimals)} {symbol}. A lower cap blocks new
            transfers there until holders bring shares back.
          </p>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={units === undefined || tx.isBusy}>
            {tx.isBusy && <Spinner />}
            Save cap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ResendDialog = ({ spoke, onClose }: { spoke: Spoke; onClose: () => void }) => {
  const { investors } = useInvestorDirectory();
  const tx = useTransaction();
  const candidates = investors.filter(investor => investor.status && investor.status !== "None");
  const [selected, setSelected] = useState<Set<Address>>(
    () => new Set(candidates.filter(entry => isInSync(entry, spoke.chainId) === false).map(entry => entry.address)),
  );
  // A transfer and a status message are the same size, so the transfer quote prices each status.
  const perAccount = useReadContract({ ...hub, functionName: "quoteSendToSpoke", args: [BigInt(spoke.chainId)] });
  const fee = perAccount.data !== undefined ? perAccount.data * BigInt(selected.size) : undefined;

  const toggle = (address: Address) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });

  const send = async () => {
    if (fee === undefined) return;
    const receipt = await tx.send({
      ...hub,
      functionName: "resendCompliance",
      args: [BigInt(spoke.chainId), [...selected]],
      value: hubFeeValue(fee),
      label: `Resend ${selected.size} status${selected.size === 1 ? "" : "es"} to ${getProfile(spoke.chainId).name}`,
    });
    if (receipt) onClose();
  };

  return (
    <Dialog open onOpenChange={open => !open && !tx.isBusy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resend approvals to {getProfile(spoke.chainId).name}</DialogTitle>
          <DialogDescription>
            Sends each investor&apos;s current status from the hub again. The spoke ignores any it already applied, so
            this is always safe. Use it for a new spoke or a message that never arrived.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {candidates.map(entry => {
            const synced = isInSync(entry, spoke.chainId);
            return (
              <li key={entry.address}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                  <Checkbox checked={selected.has(entry.address)} onCheckedChange={() => toggle(entry.address)} />
                  <span className="flex-1 font-mono text-sm">{shortAddress(entry.address, 6)}</span>
                  <StatusBadge status={entry.status} />
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {synced === false ? "Not applied" : synced ? "Up to date" : "…"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between rounded-lg border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">Bridge fee</span>
          <span>{formatHbar(fee)}, unused part refunded</span>
        </div>
        <DialogFooter>
          <Button onClick={send} disabled={selected.size === 0 || fee === undefined || tx.isBusy}>
            {tx.isBusy && <Spinner />}
            Resend {selected.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * One card per spoke: its bridge, how full its cap is, whether it is paused, and whether every investor's
 * latest status has reached it.
 */
export const SpokesPanel = () => {
  const { decimals, symbol } = useHub();
  const { spokes } = useSpokes();
  const { investors } = useInvestorDirectory();
  const { isIssuer } = useIssuer();
  const [editing, setEditing] = useState<{ spoke: Spoke; dialog: "cap" | "resend" }>();

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {spokes.map(spoke => {
        const used = spoke.cap ? (Number(spoke.outstanding ?? 0n) / Number(spoke.cap)) * 100 : 0;
        const behind = investors.filter(entry => isInSync(entry, spoke.chainId) === false).length;
        const inTransit =
          spoke.outstanding !== undefined && spoke.supply !== undefined ? spoke.outstanding - spoke.supply : undefined;
        const paused = spoke.hubPaused
          ? "Paused by the hub"
          : spoke.guardianPaused
            ? "Paused by its guardian"
            : undefined;
        return (
          <Card key={spoke.chainId} className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ChainIcon chainId={spoke.chainId} size={40} />
                <div className="flex flex-col">
                  <CardTitle className="text-lg">{getProfile(spoke.chainId).name}</CardTitle>
                  <CardDescription>
                    {spoke.bridge ? BRIDGE_NAMES[spoke.bridge] : "Unknown bridge"}
                    {spoke.route?.relayChainId && `, relayed on ${getProfile(spoke.route.relayChainId).name}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {paused ? (
                  <Badge variant="destructive">{paused}</Badge>
                ) : (
                  <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                    Live
                  </Badge>
                )}
                {behind > 0 ? (
                  <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                    {behind} status{behind === 1 ? "" : "es"} not applied
                  </Badge>
                ) : (
                  <Badge variant="outline">Statuses up to date</Badge>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Holds</span>
                  <span className="tabular-nums">
                    {formatAmount(spoke.outstanding, decimals)} of {formatAmount(spoke.cap, decimals, 0)} {symbol}
                  </span>
                </div>
                <Progress value={Math.max(used, used > 0 ? 1 : 0)} className="h-1.5" />
                <span className="text-xs text-muted-foreground">
                  {used > 0 && used < 0.01 ? "Under 0.01" : used.toFixed(used < 1 ? 2 : 1)}% of the cap
                  {inTransit ? ` · ${formatAmount(inTransit, decimals)} ${symbol} on the bridge` : ""}
                </span>
              </div>
              {spoke.gateway && (
                <a
                  href={contractUrl(spoke.chainId, spoke.gateway)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  Gateway {shortAddress(spoke.gateway)}
                </a>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!isIssuer}
                onClick={() => setEditing({ spoke, dialog: "cap" })}
              >
                <SlidersHorizontalIcon />
                Change cap
              </Button>
              <Button
                variant={behind > 0 ? "default" : "outline"}
                size="sm"
                disabled={!isIssuer}
                onClick={() => setEditing({ spoke, dialog: "resend" })}
              >
                <RefreshCwIcon />
                Resend approvals
              </Button>
            </CardFooter>
          </Card>
        );
      })}
      {editing?.dialog === "cap" && <CapDialog spoke={editing.spoke} onClose={() => setEditing(undefined)} />}
      {editing?.dialog === "resend" && <ResendDialog spoke={editing.spoke} onClose={() => setEditing(undefined)} />}
    </div>
  );
};
