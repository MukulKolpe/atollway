"use client";

import { useState } from "react";
import { CheckIcon, ClockIcon, MoreHorizontalIcon, SearchIcon, UserCheckIcon } from "lucide-react";
import { Address, isAddress, parseAbi } from "viem";
import { useReadContract } from "wagmi";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { StatusBadge } from "~~/components/atollway/StatusBadge";
import { ConfirmDialog } from "~~/components/atollway/issuer/ConfirmDialog";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~~/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~~/components/ui/input-group";
import { Skeleton } from "~~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "~~/components/ui/tooltip";
import { useHub } from "~~/hooks/atollway/useHub";
import { DirectoryEntry, InvestorStatus, isInSync, useInvestorDirectory } from "~~/hooks/atollway/useInvestorDirectory";
import { useIssuer } from "~~/hooks/atollway/useIssuer";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { INVESTOR_STATUS, hub } from "~~/utils/atollway/contracts";
import { formatHbar, hubFeeValue } from "~~/utils/atollway/fees";
import { formatAmount, shortAddress } from "~~/utils/atollway/format";
import { getProfile } from "~~/utils/atollway/networks";

const isAssociatedAbi = parseAbi(["function isAssociated() view returns (bool)"]);

type Action = "approve" | "freeze" | "unfreeze" | "revoke";

const ACTIONS: Record<
  Action,
  {
    functionName: "approveInvestor" | "freezeInvestor" | "unfreezeInvestor" | "revokeInvestor";
    label: string;
    from: InvestorStatus[];
    effect: string;
    destructive?: boolean;
  }
> = {
  approve: {
    functionName: "approveInvestor",
    label: "Approve",
    from: ["None", "Revoked"],
    effect: "Grants KYC on Hedera, so they can subscribe and hold shares, and sends the approval to every spoke.",
  },
  freeze: {
    functionName: "freezeInvestor",
    label: "Freeze",
    from: ["Approved"],
    effect: "Freezes their shares on Hedera and on every spoke. Nothing can move until you unfreeze them.",
    destructive: true,
  },
  unfreeze: {
    functionName: "unfreezeInvestor",
    label: "Unfreeze",
    from: ["Frozen"],
    effect: "Lifts the freeze on Hedera and on every spoke. They are approved again.",
  },
  revoke: {
    functionName: "revokeInvestor",
    label: "Revoke",
    from: ["Approved", "Frozen"],
    effect: "Revokes their KYC on Hedera and on every spoke. They keep their shares but cannot move them.",
    destructive: true,
  },
};

const actionsFor = (status: InvestorStatus | undefined) =>
  (Object.keys(ACTIONS) as Action[]).filter(action => status && ACTIONS[action].from.includes(status));

/** One dot per spoke: whether it has applied the investor's latest status. */
const SyncDots = ({ entry }: { entry: DirectoryEntry }) => {
  const { spokes } = useSpokes();
  return (
    <div className="flex items-center gap-1">
      {spokes.map(spoke => {
        const synced = isInSync(entry, spoke.chainId);
        const name = getProfile(spoke.chainId).name;
        return (
          <Tooltip key={spoke.chainId}>
            <TooltipTrigger asChild>
              <span className="relative">
                <ChainIcon chainId={spoke.chainId} size={20} className={synced === false ? "opacity-40" : undefined} />
                {synced === false && (
                  <ClockIcon className="absolute -right-1 -bottom-1 size-3 rounded-full bg-card text-warning" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {synced === false
                ? `${name} has not applied the latest status yet. It may still be on the bridge, or resend it from Spokes.`
                : `${name} is up to date`}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

/**
 * Investors: who is waiting for approval, everyone's status on Hedera and on each spoke, and the issuer's
 * decisions.
 */
export const InvestorsPanel = () => {
  const { decimals, symbol, token } = useHub();
  const { isIssuer, complianceFee } = useIssuer();
  const { spokes } = useSpokes();
  const { investors, isLoading, refetch } = useInvestorDirectory();
  const tx = useTransaction();
  const [pending, setPending] = useState<{ address: Address; action: Action }>();
  const [lookup, setLookup] = useState("");

  const lookupAddress = isAddress(lookup) ? (lookup as Address) : undefined;
  const lookupAssociated = useReadContract({
    address: token,
    abi: isAssociatedAbi,
    functionName: "isAssociated",
    chainId: hub.chainId,
    account: lookupAddress,
    query: { enabled: Boolean(lookupAddress && token) },
  });
  const lookupStatus = useReadContract({
    ...hub,
    functionName: "statusOf",
    args: [lookupAddress!],
    query: { enabled: Boolean(lookupAddress) },
  });
  const lookupState = lookupStatus.data === undefined ? undefined : INVESTOR_STATUS[lookupStatus.data];

  const waiting = investors.filter(investor => investor.associated && investor.status === "None");
  const decided = investors.filter(investor => investor.status && investor.status !== "None");

  const confirm = async () => {
    if (!pending || complianceFee === undefined) return;
    const { functionName, label } = ACTIONS[pending.action];
    const receipt = await tx.send({
      ...hub,
      functionName,
      args: [pending.address],
      value: hubFeeValue(complianceFee),
      label: `${label} ${shortAddress(pending.address)}`,
    });
    if (receipt) {
      setPending(undefined);
      setLookup("");
      await refetch();
    }
  };

  const actionMenu = (entry: { address: Address; status?: InvestorStatus }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Investor actions" disabled={!isIssuer}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {actionsFor(entry.status).map(action => (
          <DropdownMenuItem
            key={action}
            variant={ACTIONS[action].destructive ? "destructive" : "default"}
            onSelect={() => setPending({ address: entry.address, action })}
          >
            {ACTIONS[action].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheckIcon className="size-5 text-primary" />
              Waiting for approval
            </CardTitle>
            <CardDescription>Accounts that linked {symbol} on Hedera but are not approved yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : waiting.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nobody is waiting. New investors appear here once they link the token.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {waiting.map(entry => (
                  <li key={entry.address} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-mono text-sm">{shortAddress(entry.address, 6)}</span>
                      <span className="text-xs text-muted-foreground">Hedera account {entry.accountId}</span>
                    </div>
                    <Button
                      size="sm"
                      disabled={!isIssuer}
                      onClick={() => setPending({ address: entry.address, action: "approve" })}
                    >
                      <CheckIcon />
                      Approve
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SearchIcon className="size-5 text-primary" />
              Find an investor
            </CardTitle>
            <CardDescription>Paste an EVM address to see its status and act on it.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <InputGroup>
              <InputGroupInput
                placeholder="0x…"
                value={lookup}
                onChange={event => setLookup(event.target.value.trim())}
                className="font-mono"
                aria-label="Investor address"
              />
              {lookup && !lookupAddress && <InputGroupAddon align="inline-end">Not an address</InputGroupAddon>}
            </InputGroup>
            {lookupAddress && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-mono text-sm">{shortAddress(lookupAddress, 6)}</span>
                  <span className="text-xs text-muted-foreground">
                    {lookupAssociated.data === undefined
                      ? "Checking…"
                      : lookupAssociated.data
                        ? `Linked ${symbol} on Hedera`
                        : `Has not linked ${symbol} yet. Ask them to open Invest and link the token first.`}
                  </span>
                </div>
                <StatusBadge status={lookupState} />
                {lookupState === "None" || lookupState === "Revoked" ? (
                  <Button
                    size="sm"
                    disabled={!isIssuer || !lookupAssociated.data}
                    onClick={() => setPending({ address: lookupAddress, action: "approve" })}
                  >
                    Approve
                  </Button>
                ) : (
                  lookupState && actionMenu({ address: lookupAddress, status: lookupState })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Investors</CardTitle>
          <CardDescription>
            Decisions are made on Hedera and sent to every spoke. Each icon shows whether that spoke has applied the
            latest one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : decided.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>No investors yet</EmptyTitle>
                <EmptyDescription>Approved, frozen and revoked investors appear here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">On Hedera</TableHead>
                  <TableHead>Spokes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {decided.map(entry => (
                  <TableRow key={entry.address}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{shortAddress(entry.address, 6)}</span>
                        {entry.accountId && <span className="text-xs text-muted-foreground">{entry.accountId}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(entry.balance, decimals)} <span className="text-muted-foreground">{symbol}</span>
                    </TableCell>
                    <TableCell>{spokes.length > 0 && <SyncDots entry={entry} />}</TableCell>
                    <TableCell>{actionMenu(entry)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pending !== undefined}
        onOpenChange={open => !open && !tx.isBusy && setPending(undefined)}
        title={pending ? `${ACTIONS[pending.action].label} ${shortAddress(pending.address)}?` : ""}
        description={pending ? ACTIONS[pending.action].effect : ""}
        details={
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bridge fee for {spokes.length} spokes</span>
            <span>
              {formatHbar(complianceFee)}
              <span className="block text-right text-xs text-muted-foreground">Unused fee is refunded</span>
            </span>
          </div>
        }
        confirmLabel={pending ? ACTIONS[pending.action].label : ""}
        destructive={pending ? ACTIONS[pending.action].destructive : false}
        busy={tx.isBusy}
        onConfirm={confirm}
      />
    </div>
  );
};
