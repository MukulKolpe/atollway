"use client";

import { ShieldCheckIcon, ShieldIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { InvestorsPanel } from "~~/components/atollway/issuer/InvestorsPanel";
import { SettingsPanel } from "~~/components/atollway/issuer/SettingsPanel";
import { SpokesPanel } from "~~/components/atollway/issuer/SpokesPanel";
import { Alert, AlertDescription, AlertTitle } from "~~/components/ui/alert";
import { Badge } from "~~/components/ui/badge";
import { Card, CardContent } from "~~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~~/components/ui/tabs";
import { useHub } from "~~/hooks/atollway/useHub";
import { useInvestorDirectory } from "~~/hooks/atollway/useInvestorDirectory";
import { useIssuer } from "~~/hooks/atollway/useIssuer";
import { useSpokes } from "~~/hooks/atollway/useSpokes";
import { shortAddress } from "~~/utils/atollway/format";

/**
 * The issuer's page: approve and restrict investors, manage spokes, and set the asset's NAV and pause state.
 * Anyone can view it; only the hub's owner can act.
 */
export const IssuerConsole = () => {
  const { address } = useAccount();
  const { isIssuer, owner } = useIssuer();
  const { investors } = useInvestorDirectory();
  const { spokes } = useSpokes();
  const { paused } = useHub();
  const waiting = investors.filter(investor => investor.associated && investor.status === "None").length;
  const approved = investors.filter(investor => investor.status === "Approved").length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-10 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Issuer console</h1>
          <p className="text-sm text-muted-foreground">
            Decisions are made once on Hedera and reach every chain through the bridges.
          </p>
        </div>
        {isIssuer && (
          <Badge variant="outline" className="h-7 gap-1.5 border-success/30 bg-success/10 px-3 text-success">
            <ShieldCheckIcon />
            You are the issuer
          </Badge>
        )}
      </div>

      {!isIssuer && (
        <Alert>
          <ShieldIcon />
          <AlertTitle>View only</AlertTitle>
          <AlertDescription>
            {address ? "This wallet is not the issuer." : "No wallet is connected."} Connect the issuer&apos;s wallet
            {owner ? ` (${shortAddress(owner)})` : ""} to approve investors or change settings.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Approved investors", value: approved },
          { label: "Waiting for approval", value: waiting },
          { label: "Spokes", value: spokes.length },
          { label: "Asset", value: paused ? "Paused" : "Live" },
        ].map(item => (
          <Card key={item.label} className="glass gap-1 py-4">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-2xl font-semibold tracking-tight">{item.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="investors" className="gap-6">
        <TabsList className="h-10">
          <TabsTrigger value="investors" className="px-4">
            Investors
            {waiting > 0 && <Badge className="ml-1.5 h-5 rounded-full px-1.5">{waiting}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="spokes" className="px-4">
            Spokes
            <span className="ml-1.5 text-xs text-muted-foreground">{spokes.length}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="px-4">
            Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="investors">
          <InvestorsPanel />
        </TabsContent>
        <TabsContent value="spokes">
          <SpokesPanel />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
