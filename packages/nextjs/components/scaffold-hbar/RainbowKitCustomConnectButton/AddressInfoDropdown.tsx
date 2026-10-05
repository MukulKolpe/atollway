"use client";

import { blo } from "blo";
import { CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, LogOutIcon } from "lucide-react";
import { Address } from "viem";
import { useDisconnect } from "wagmi";
import { Button } from "~~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~~/components/ui/dropdown-menu";
import { useCopyToClipboard, useHederaAccountId } from "~~/hooks/scaffold-hbar";
import { shortAddress } from "~~/utils/atollway/format";
import { HUB_CHAIN_ID } from "~~/utils/atollway/networks";

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayBalance?: string;
};

/**
 * The connected account: copy the address, see it on the explorer, or disconnect.
 */
export const AddressInfoDropdown = ({
  address,
  blockExplorerAddressLink,
  displayBalance,
}: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const { accountId } = useHederaAccountId(address, HUB_CHAIN_ID);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-full pl-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blo(address as `0x${string}`)} alt="" className="size-6 rounded-full" />
          <span className="hidden font-mono text-xs sm:inline">{shortAddress(address)}</span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="font-mono text-xs text-foreground">{shortAddress(address, 10)}</span>
          {accountId && <span className="text-xs">Hedera account {accountId}</span>}
          {displayBalance && <span className="text-xs">{displayBalance}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={event => {
            event.preventDefault();
            copyToClipboard(address);
          }}
        >
          {isCopiedToClipboard ? <CheckIcon className="text-success" /> : <CopyIcon />}
          {isCopiedToClipboard ? "Copied" : "Copy address"}
        </DropdownMenuItem>
        {blockExplorerAddressLink && (
          <DropdownMenuItem asChild>
            <a href={blockExplorerAddressLink} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              View on explorer
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => disconnect()}>
          <LogOutIcon />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
