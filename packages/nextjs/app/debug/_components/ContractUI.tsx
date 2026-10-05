"use client";

// @refresh reset
import { Contract } from "@scaffold-hbar-ui/debug-contracts";
import { Spinner } from "~~/components/ui/spinner";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";
import { ContractName } from "~~/utils/scaffold-hbar/contract";

type ContractUIProps = {
  contractName: ContractName;
  className?: string;
};

/**
 * UI component to interface with deployed contracts.
 **/
export const ContractUI = ({ contractName }: ContractUIProps) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo({ contractName });

  if (deployedContractLoading) {
    return (
      <div className="mt-14">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!deployedContractData) {
    return (
      <p className="mt-14 text-xl text-muted-foreground">
        No contract named {String(contractName)} on {targetNetwork.name}.
      </p>
    );
  }

  return <Contract contractName={contractName as string} contract={deployedContractData} chainId={targetNetwork.id} />;
};
