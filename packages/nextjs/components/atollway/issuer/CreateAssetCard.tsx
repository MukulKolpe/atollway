"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { parseEther } from "viem";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { Spinner } from "~~/components/ui/spinner";
import { useHub } from "~~/hooks/atollway/useHub";
import { useIssuer } from "~~/hooks/atollway/useIssuer";
import { useTransaction } from "~~/hooks/atollway/useTransaction";
import { hub } from "~~/utils/atollway/contracts";

/** Covers Hedera's token creation fee, about 1 US dollar. The hub returns what is not used. */
const CREATION_FEE = parseEther("20");

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium">{label}</span>
    {children}
    {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
  </label>
);

/**
 * Creates the asset token on a freshly deployed hub, so a new project goes from deploy to first investor in the app.
 */
export const CreateAssetCard = () => {
  const { refetch } = useHub();
  const { isIssuer } = useIssuer();
  const tx = useTransaction();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("6");
  const [memo, setMemo] = useState("");
  const ready = name.trim() && symbol.trim() && /^\d+$/.test(decimals) && Number(decimals) <= 18;

  const create = async () => {
    const receipt = await tx.send({
      ...hub,
      functionName: "createAsset",
      args: [name.trim(), symbol.trim().toUpperCase(), Number(decimals), memo.trim()],
      value: CREATION_FEE,
      label: `Create ${symbol.trim().toUpperCase()}`,
    });
    if (receipt) await refetch();
  };

  return (
    <Card className="glass border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <SparklesIcon className="size-5 text-primary" />
          Create your asset
        </CardTitle>
        <CardDescription className="text-base">
          This hub has no asset yet. Create it as a Hedera Token Service token: the hub becomes its treasury and holds
          its KYC, freeze, wipe, supply and pause keys. It can be created once.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              placeholder="Atollway Demo Fund"
              value={name}
              onChange={event => setName(event.target.value)}
              className="h-11 text-base"
            />
          </Field>
          <Field label="Symbol">
            <Input
              placeholder="ATLD"
              value={symbol}
              onChange={event => setSymbol(event.target.value)}
              className="h-11 text-base uppercase"
            />
          </Field>
          <Field label="Decimals" hint="Six is common for fund shares.">
            <Input
              inputMode="numeric"
              value={decimals}
              onChange={event => setDecimals(event.target.value)}
              className="h-11 text-base"
            />
          </Field>
          <Field label="Memo" hint="Optional, shown on HashScan.">
            <Input
              placeholder="Testnet demo fund"
              value={memo}
              onChange={event => setMemo(event.target.value)}
              className="h-11 text-base"
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            size="lg"
            className="h-11 rounded-full px-6 text-base"
            disabled={!isIssuer || !ready || tx.isBusy}
            onClick={create}
          >
            {tx.isBusy && <Spinner />}
            {isIssuer ? "Create the asset" : "Connect the issuer wallet"}
          </Button>
          <span className="text-sm text-muted-foreground">
            Sends 20 HBAR for Hedera&apos;s creation fee of about 1 US dollar. The rest comes back. Then set the NAV
            under Settings to open subscriptions.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
