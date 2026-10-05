"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, LinkIcon } from "lucide-react";
import { Address } from "viem";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Spinner } from "~~/components/ui/spinner";
import { useInvestor } from "~~/hooks/atollway/useInvestor";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { useCopyToClipboard } from "~~/hooks/scaffold-hbar";
import { cn } from "~~/lib/utils";
import { htsTokenAbi, hub } from "~~/utils/atollway/contracts";
import { getProfile } from "~~/utils/atollway/networks";

type Step = {
  title: string;
  description: React.ReactNode;
  done: boolean;
  action?: React.ReactNode;
};

/**
 * The four things an investor does once: get a Hedera account, link the token, get approved, buy shares.
 */
export const Onboarding = ({ address }: { address: Address }) => {
  const investor = useInvestor(address);
  const link = useTransaction();
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const { hasAccount, isAssociated, status, total, token, symbol } = investor;

  const linkToken = async () => {
    if (!token) return;
    const receipt = await link.send({
      chainId: hub.chainId,
      address: token,
      abi: htsTokenAbi,
      functionName: "associate",
      label: `Link ${symbol} to your account`,
    });
    if (receipt) await investor.refetch();
  };

  const steps: Step[] = [
    {
      title: "Create your Hedera account",
      description: "Your wallet address becomes a Hedera account the first time it receives HBAR.",
      done: hasAccount === true,
      action: (
        <Button asChild size="sm" variant="outline">
          <a href={getProfile(hub.chainId).faucet} target="_blank" rel="noreferrer">
            Get testnet HBAR
            <ExternalLinkIcon />
          </a>
        </Button>
      ),
    },
    {
      title: `Link ${symbol} to your account`,
      description: "Hedera accounts accept a token only after linking it. It is one small transaction.",
      done: isAssociated === true,
      action: (
        <Button size="sm" onClick={linkToken} disabled={!hasAccount || link.isBusy}>
          {link.isBusy ? <Spinner /> : <LinkIcon />}
          Link token
        </Button>
      ),
    },
    {
      title: "Get approved by the issuer",
      description:
        status === "Frozen"
          ? "The issuer has frozen your shares. Contact them to unfreeze."
          : status === "Revoked"
            ? "The issuer has revoked your approval."
            : "Send your address to the issuer. Once they approve you, every chain learns about it.",
      done: status === "Approved",
      action: (
        <Button size="sm" variant="outline" onClick={() => copyToClipboard(address)}>
          {isCopiedToClipboard ? <CheckIcon /> : <CopyIcon />}
          {isCopiedToClipboard ? "Copied" : "Copy my address"}
        </Button>
      ),
    },
    {
      title: "Buy your first shares",
      description: "Subscribe with HBAR below. Shares arrive in the same transaction.",
      done: total !== undefined && total > 0n,
    },
  ];

  const current = steps.findIndex(step => !step.done);
  if (investor.isLoading || current === -1) return null;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Get set up</CardTitle>
        <CardDescription>
          {current} of {steps.length} done. Each step happens once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {steps.map((step, i) => {
            const isCurrent = i === current;
            return (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-8 left-[15px] h-[calc(100%-2rem)] w-px bg-border",
                      step.done && "bg-primary/50",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "relative flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium",
                    step.done && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary ring-4 ring-primary/15",
                    !step.done && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.done ? <CheckIcon className="size-4" /> : i + 1}
                </span>
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className={cn("font-medium", !step.done && !isCurrent && "text-muted-foreground")}>
                    {step.title}
                  </span>
                  {isCurrent && (
                    <>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.action && <div className="pt-1">{step.action}</div>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
};
