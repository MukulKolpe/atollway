"use client";

import { useState } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectPrompt } from "~~/components/atollway/ConnectPrompt";
import { StatusBadge } from "~~/components/atollway/StatusBadge";
import { Onboarding } from "~~/components/atollway/invest/Onboarding";
import { Portfolio } from "~~/components/atollway/invest/Portfolio";
import { SubscribeCard } from "~~/components/atollway/invest/SubscribeCard";
import { TransferDialog } from "~~/components/atollway/transfers/TransferDialog";
import { TransferList } from "~~/components/atollway/transfers/TransferList";
import { useInvestor } from "~~/hooks/atollway/useInvestor";
import { shortAddress } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID, getProfile } from "~~/utils/atollway/networks";

const REQUIREMENTS = [
  "A wallet such as MetaMask",
  "Testnet HBAR from the Hedera faucet",
  "Approval from the issuer, which you ask for here",
];

/**
 * The investor's page: setup, subscriptions, holdings on every chain and transfers between them.
 */
export const InvestorPortal = () => {
  const { address } = useAccount();
  const investor = useInvestor(address);
  const [moveFrom, setMoveFrom] = useState<number>();

  if (!address) {
    return (
      <div className="flex flex-1 items-center px-4 py-16">
        <ConnectPrompt
          title="Invest from any chain"
          description="Connect the wallet you want to hold shares with. You can move them between chains whenever you like."
        >
          <ul className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
            {REQUIREMENTS.map(item => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </ConnectPrompt>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-10 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Your portfolio</h1>
          <p className="text-sm text-muted-foreground">
            {shortAddress(address, 6)}
            {investor.accountId && ` · Hedera account ${investor.accountId}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Issuer status on {getProfile(HUB_CHAIN_ID).name}
          <StatusBadge status={investor.status} />
        </div>
      </div>

      {/* One column on phones, with setup first; two columns from lg up. */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-2 min-w-0 lg:order-none">
            <Portfolio address={address} onMove={setMoveFrom} />
          </div>
          <div className="order-4 min-w-0 lg:order-none">
            <TransferList address={address} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-1 min-w-0 empty:hidden lg:order-none">
            <Onboarding address={address} />
          </div>
          <div className="order-3 min-w-0 lg:order-none">
            <SubscribeCard address={address} />
          </div>
        </div>
      </div>

      <TransferDialog
        address={address}
        open={moveFrom !== undefined}
        initialSource={moveFrom}
        onOpenChange={open => !open && setMoveFrom(undefined)}
      />
    </div>
  );
};
