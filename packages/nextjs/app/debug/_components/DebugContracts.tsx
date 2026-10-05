"use client";

import { useEffect, useMemo } from "react";
import { ContractUI } from "./ContractUI";
import "@scaffold-hbar-ui/components/styles.css";
import "@scaffold-hbar-ui/debug-contracts/styles.css";
import { useSessionStorage } from "usehooks-ts";
import { useAccount, useSwitchChain } from "wagmi";
import { ChainIcon } from "~~/components/atollway/ChainIcon";
import { Button } from "~~/components/ui/button";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useGlobalState } from "~~/services/store/store";
import { NETWORKS, getProfile } from "~~/utils/atollway/networks";
import { NETWORKS_EXTRA_DATA } from "~~/utils/scaffold-hbar";
import { ContractName } from "~~/utils/scaffold-hbar/contract";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

const selectedContractStorageKey = "scaffoldEth2.selectedContract";

export function DebugContracts() {
  const { targetNetwork } = useTargetNetwork();
  const setTargetNetwork = useGlobalState(({ setTargetNetwork }) => setTargetNetwork);
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const contractsData = useAllContracts();
  const contractNames = useMemo(
    () =>
      Object.keys(contractsData).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      }) as ContractName[],
    [contractsData],
  );

  const [selectedContract, setSelectedContract] = useSessionStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
    { initializeWithValue: false },
  );

  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

  return (
    <div className="flex flex-col items-center gap-y-6 py-8 lg:gap-y-8 lg:py-12">
      <div className="flex w-full max-w-7xl flex-col gap-3 px-6 lg:px-10">
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map(network => (
            <Button
              key={network.id}
              variant={network.id === targetNetwork.id ? "secondary" : "ghost"}
              className="rounded-full"
              onClick={() =>
                isConnected
                  ? switchChain({ chainId: network.id })
                  : setTargetNetwork({ ...network, ...NETWORKS_EXTRA_DATA[network.id] })
              }
            >
              <ChainIcon chainId={network.id} size={18} />
              {getProfile(network.id).name}
            </Button>
          ))}
        </div>
        {contractNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {contractNames.map(contractName => (
              <Button
                key={String(contractName)}
                variant={contractName === selectedContract ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedContract(contractName)}
              >
                {String(contractName)}
              </Button>
            ))}
          </div>
        )}
      </div>
      {contractNames.length === 0 ? (
        <p className="mt-14 text-xl text-muted-foreground">No contracts on {targetNetwork.name}.</p>
      ) : (
        contractNames.map(
          contractName =>
            contractName === selectedContract && <ContractUI key={String(contractName)} contractName={contractName} />,
        )
      )}
    </div>
  );
}
