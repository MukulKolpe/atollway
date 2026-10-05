import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Abi, Address, ContractFunctionArgs, ContractFunctionName, Hash, TransactionReceipt } from "viem";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { describeError } from "~~/utils/atollway/errors";
import { txUrl } from "~~/utils/atollway/networks";

export type TransactionStatus = "idle" | "switching" | "signing" | "confirming" | "success" | "error";

type Call<TAbi extends Abi, TFunctionName extends ContractFunctionName<TAbi, "nonpayable" | "payable">> = {
  chainId: number;
  address: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args?: ContractFunctionArgs<TAbi, "nonpayable" | "payable", TFunctionName>;
  value?: bigint;
  /** What the transaction does, for the notifications: "Subscribe for 1.2 ATLD". */
  label: string;
};

/**
 * Sends one contract call: switches the wallet to the right chain, simulates the call so a revert shows its
 * reason before anything is signed, then waits for the receipt. Progress shows as a notification.
 */
export function useTransaction() {
  const config = useConfig();
  const { address, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [status, setStatus] = useState<TransactionStatus>("idle");
  const [hash, setHash] = useState<Hash>();

  const send = useCallback(
    async <TAbi extends Abi, TFunctionName extends ContractFunctionName<TAbi, "nonpayable" | "payable">>(
      call: Call<TAbi, TFunctionName>,
    ): Promise<TransactionReceipt | undefined> => {
      const { label, chainId, ...contract } = call;
      const toastId = toast.loading(label, { description: "Preparing…" });
      setHash(undefined);
      try {
        if (walletChainId !== chainId) {
          setStatus("switching");
          toast.loading(label, { id: toastId, description: "Switch network in your wallet." });
          await switchChainAsync({ chainId });
        }

        setStatus("signing");
        toast.loading(label, { id: toastId, description: "Confirm in your wallet." });
        const { request } = await simulateContract(config, { ...contract, chainId, account: address } as any);
        const txHash = await writeContract(config, request);
        setHash(txHash);

        setStatus("confirming");
        toast.loading(label, { id: toastId, description: "Waiting for the network to confirm…" });
        const receipt = await waitForTransactionReceipt(config, { hash: txHash, chainId } as any);
        if (receipt.status !== "success") throw new Error("The transaction reverted.");

        setStatus("success");
        toast.success(label, {
          id: toastId,
          description: "Confirmed.",
          action: { label: "View", onClick: () => window.open(txUrl(chainId, txHash), "_blank") },
        });
        return receipt;
      } catch (error) {
        console.error(error);
        setStatus("error");
        toast.error(label, { id: toastId, description: describeError(error) });
        return undefined;
      }
    },
    [address, config, switchChainAsync, walletChainId],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setHash(undefined);
  }, []);

  return {
    send,
    status,
    hash,
    reset,
    isBusy: status === "switching" || status === "signing" || status === "confirming",
  };
}
