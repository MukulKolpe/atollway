"use client";

import { CheckIcon } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { DropdownMenuItem } from "~~/components/ui/dropdown-menu";
import { NETWORKS, getProfile, isHub } from "~~/utils/atollway/networks";

/**
 * Menu items that switch the wallet to each of the app's networks.
 */
export const NetworkOptions = () => {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  return (
    <>
      {NETWORKS.map(network => (
        <DropdownMenuItem
          key={network.id}
          onSelect={() => network.id !== chain?.id && switchChain({ chainId: network.id })}
          className="gap-2.5"
        >
          <ChainIcon chainId={network.id} size={18} />
          <span className="flex-1">{getProfile(network.id).name}</span>
          {isHub(network.id) && <span className="text-xs text-muted-foreground">Hub</span>}
          {network.id === chain?.id && <CheckIcon className="text-primary" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};
