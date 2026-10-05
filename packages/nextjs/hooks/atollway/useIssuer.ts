import { useAccount, useReadContracts } from "wagmi";
import { useHub } from "~~/hooks/atollway/useHub";
import { hub } from "~~/utils/atollway/contracts";

/**
 * Whether the connected wallet is the issuer, and the bridge fees of the issuer's broadcasts, in tinybars.
 */
export function useIssuer() {
  const { address } = useAccount();
  const { owner } = useHub();

  const fees = useReadContracts({
    allowFailure: true,
    contracts: [
      { ...hub, functionName: "quoteComplianceBroadcast" },
      { ...hub, functionName: "quotePauseBroadcast" },
    ],
    query: { refetchInterval: 30_000 },
  });

  return {
    owner,
    isIssuer: Boolean(address && owner && address.toLowerCase() === owner.toLowerCase()),
    /** The fee to send one investor's new status to every spoke. */
    complianceFee: fees.data?.[0]?.result as bigint | undefined,
    /** The fee to send a pause or resume to every spoke. */
    pauseFee: fees.data?.[1]?.result as bigint | undefined,
  };
}
