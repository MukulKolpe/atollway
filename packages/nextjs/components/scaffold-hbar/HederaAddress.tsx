"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import type { Address as AddressType, Chain } from "viem";
import { getAddress } from "viem";
import { BlockieAvatar } from "~~/components/scaffold-hbar";
import { Skeleton } from "~~/components/ui/skeleton";
import { useCopyToClipboard, useHederaAccountId } from "~~/hooks/scaffold-hbar";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-hbar";

type HederaAddressProps = {
  address?: AddressType;
  chain: Chain;
  format?: "short" | "long";
  disableAddressLink?: boolean;
};

/**
 * An EVM address with its avatar, a copy button and, on Hedera, the account ID it belongs to.
 */
export const HederaAddress = ({ address, chain, format, disableAddressLink }: HederaAddressProps) => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const { accountId, isLoading } = useHederaAccountId(address, chain.id);

  if (!address) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const checkSumAddress = getAddress(address);
  const shortAddress = `${checkSumAddress.slice(0, 6)}...${checkSumAddress.slice(-4)}`;
  const displayAddress = format === "long" ? checkSumAddress : shortAddress;
  const explorerLink = getBlockExplorerAddressLink(chain, checkSumAddress);
  const addressContent = <span className="font-mono text-sm">{displayAddress}</span>;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <BlockieAvatar address={checkSumAddress} size={24} ensImage={null} />
        {disableAddressLink ? (
          addressContent
        ) : (
          <a href={explorerLink} target="_blank" rel="noreferrer" className="hover:underline">
            {addressContent}
          </a>
        )}
        <button
          type="button"
          aria-label="Copy address"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => copyToClipboard(checkSumAddress)}
        >
          {isCopiedToClipboard ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}
        </button>
      </div>
      {isLoading ? (
        <Skeleton className="h-3 w-40" />
      ) : accountId ? (
        <span className="text-xs text-muted-foreground">Hedera account {accountId}</span>
      ) : null}
    </div>
  );
};
