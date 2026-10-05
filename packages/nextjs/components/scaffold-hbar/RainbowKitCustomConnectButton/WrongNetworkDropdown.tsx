"use client";

import { NetworkOptions } from "./NetworkOptions";
import { ChevronDownIcon, LogOutIcon, TriangleAlertIcon } from "lucide-react";
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

/**
 * Shown when the wallet is on a chain the app does not use.
 */
export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="destructive" size="lg" className="rounded-full">
          <TriangleAlertIcon />
          Wrong network
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Switch to</DropdownMenuLabel>
        <NetworkOptions />
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => disconnect()}>
          <LogOutIcon />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
