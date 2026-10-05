"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { WalletIcon } from "lucide-react";
import { LogoMark } from "~~/components/atollway/Logo";
import { Button } from "~~/components/ui/button";
import { Card, CardContent } from "~~/components/ui/card";

type ConnectPromptProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/**
 * Asks the visitor to connect a wallet before showing a page that needs one.
 */
export const ConnectPrompt = ({ title, description, children }: ConnectPromptProps) => {
  const { openConnectModal } = useConnectModal();

  return (
    <Card className="glass mx-auto w-full max-w-xl">
      <CardContent className="flex flex-col items-center gap-5 py-6 text-center">
        <LogoMark className="size-14 motion-safe:animate-float" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-balance">{description}</p>
        </div>
        <Button size="lg" className="h-11 rounded-full px-6 text-base" onClick={openConnectModal}>
          <WalletIcon />
          Connect wallet
        </Button>
        {children}
      </CardContent>
    </Card>
  );
};
