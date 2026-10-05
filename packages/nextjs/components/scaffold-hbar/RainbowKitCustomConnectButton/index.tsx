"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { NetworkOptions } from "./NetworkOptions";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDownIcon, WalletIcon } from "lucide-react";
import { Address } from "viem";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { Button } from "~~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { accountUrl, getChain, getProfile } from "~~/utils/atollway/networks";

/**
 * Connect button, network switcher and account menu.
 */
export const RainbowKitCustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <Button size="lg" className="rounded-full px-4" onClick={openConnectModal} disabled={!mounted}>
              <WalletIcon />
              Connect wallet
            </Button>
          );
        }

        if (chain.unsupported || !getChain(chain.id)) {
          return <WrongNetworkDropdown />;
        }

        return (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="lg" className="rounded-full pl-1.5" aria-label="Switch network">
                  <ChainIcon chainId={chain.id} size={22} />
                  <span className="hidden sm:inline">{getProfile(chain.id).name}</span>
                  <ChevronDownIcon className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Network</DropdownMenuLabel>
                <NetworkOptions />
              </DropdownMenuContent>
            </DropdownMenu>
            <AddressInfoDropdown
              address={account.address as Address}
              displayBalance={account.displayBalance}
              blockExplorerAddressLink={accountUrl(chain.id, account.address)}
            />
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
