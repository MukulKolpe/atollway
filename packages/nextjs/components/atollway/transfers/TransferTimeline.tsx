"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { Spinner } from "~~/components/ui/spinner";
import { TrackedTransfer } from "~~/hooks/atollway/useTransfers";
import { cn } from "~~/lib/utils";
import { BridgeHop, fetchHops } from "~~/utils/atollway/bridges";
import { BRIDGE_NAMES } from "~~/utils/atollway/contracts";
import { timeAgo } from "~~/utils/atollway/format";
import { getProfile, txUrl } from "~~/utils/atollway/networks";
import { routeOf } from "~~/utils/atollway/routes";

type StepState = "done" | "current" | "upcoming" | "failed";

type Step = { label: string; detail?: string; href?: string; state: StepState };

/** The bridge's view of each hop, refreshed until the transfer arrives. */
export function useHops(transfer: TrackedTransfer) {
  const route = routeOf(transfer.spokeId, transfer.direction);
  return useQuery({
    queryKey: ["atollway", "hops", transfer.sourceTx],
    queryFn: () =>
      route.bridge && transfer.sourceTx ? fetchHops(route.bridge, transfer.sourceTx, route.hops.length > 1) : [],
    enabled: Boolean(transfer.sourceTx),
    refetchInterval: transfer.delivered ? false : 20_000,
  });
}

/**
 * The steps of one transfer, from the source transaction to its arrival, with links to each explorer.
 */
export const TransferTimeline = ({ transfer }: { transfer: TrackedTransfer }) => {
  const route = routeOf(transfer.spokeId, transfer.direction);
  const { data: hops = [] } = useHops(transfer);
  const bridge = route.bridge ? BRIDGE_NAMES[route.bridge] : "The bridge";
  const name = (chainId: number) => getProfile(chainId).name;

  const steps: Step[] = [
    {
      label: `Sent from ${name(transfer.sourceChainId)}`,
      detail: transfer.sourceTx ? timeAgo(transfer.time) : undefined,
      href: transfer.sourceTx ? txUrl(transfer.sourceChainId, transfer.sourceTx) : undefined,
      state: "done",
    },
  ];
  // Without the sending transaction (a transfer to Hedera sent from another browser), only the ends are known.
  const legs = transfer.sourceTx ? route.hops : [];
  legs.forEach((leg, i) => {
    const hop: BridgeHop | undefined = hops[i];
    const last = i === route.hops.length - 1;
    const finalized = transfer.delivered || (hop && hop.stage !== "finalizing");
    const delivered = transfer.delivered || hop?.stage === "delivered";
    steps.push({
      label: `${name(leg.from)} finalizes the block`,
      detail: finalized ? undefined : "Most of the wait happens here",
      state: finalized ? "done" : "upcoming",
    });
    steps.push({
      label: last ? `${bridge} delivers to ${name(leg.to)}` : `The relay on ${name(leg.to)} forwards it`,
      href: hop?.url,
      state: hop?.stage === "failed" && !transfer.delivered ? "failed" : delivered ? "done" : "upcoming",
    });
  });
  const receipt = transfer.arrivalTx ?? hops[route.hops.length - 1]?.receiptTx;
  steps.push({
    label: `Arrived on ${name(transfer.destinationChainId)}`,
    href: receipt ? txUrl(transfer.destinationChainId, receipt) : undefined,
    state: transfer.delivered ? "done" : "upcoming",
  });

  const current = steps.findIndex(step => step.state === "upcoming");
  if (current !== -1) steps[current].state = "current";

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                "absolute top-6 left-[11px] h-[calc(100%-1.5rem)] w-px bg-border",
                step.state === "done" && "bg-primary/60",
              )}
            />
          )}
          <span
            className={cn(
              "relative flex size-6 shrink-0 items-center justify-center rounded-full border bg-card",
              step.state === "done" && "border-primary bg-primary text-primary-foreground",
              step.state === "current" && "border-primary text-primary",
              step.state === "failed" && "border-destructive bg-destructive text-white",
            )}
          >
            {step.state === "done" && <CheckIcon className="size-3.5" />}
            {step.state === "current" && <Spinner className="size-3.5" />}
            {step.state === "failed" && <XIcon className="size-3.5" />}
          </span>
          <div className="flex min-w-0 flex-col pt-0.5">
            <span className={cn("text-sm", step.state === "upcoming" && "text-muted-foreground")}>
              {step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {step.label}
                  <ExternalLinkIcon className="size-3 text-muted-foreground" />
                </a>
              ) : (
                step.label
              )}
            </span>
            {step.detail && <span className="text-xs text-muted-foreground">{step.detail}</span>}
            {step.state === "failed" && (
              <span className="text-xs text-destructive">
                The bridge could not execute it. Open the bridge explorer to retry it manually.
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};
