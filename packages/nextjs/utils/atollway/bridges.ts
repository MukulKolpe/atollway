import { Hex } from "viem";
import { Bridge } from "~~/utils/atollway/contracts";

/** Where a bridge message is, in terms every bridge shares. */
export type BridgeStage = "finalizing" | "verifying" | "delivered" | "failed";

export type BridgeHop = {
  stage: BridgeStage;
  /** The bridge explorer page for this hop. */
  url: string;
  /** The transaction on the destination chain, once delivered. */
  receiptTx?: Hex;
};

const CCIP_API = "https://api.ccip.chain.link/v2";
const AXELARSCAN_API = "https://testnet.api.axelarscan.io";

/** CCIP statuses: SENT waits for source finality, then the message is committed and verified, then executed. */
function ccipStage(status: string): BridgeStage {
  if (status === "SUCCESS") return "delivered";
  if (status === "FAILED") return "failed";
  if (status === "SENT" || status === "WAITING_FOR_FINALITY") return "finalizing";
  return "verifying";
}

/** Axelar statuses: the call is confirmed once the source chain is final, then approved and executed. */
function axelarStage(status: string): BridgeStage {
  if (status === "executed") return "delivered";
  if (status === "error" || status === "insufficient_fee") return "failed";
  if (status === "called" || status === "confirming") return "finalizing";
  return "verifying";
}

/** The CCIP message sent by `sourceTx`, from Chainlink's CCIP API. Null until the API has indexed it. */
export async function fetchCcipHop(sourceTx: Hex): Promise<BridgeHop | null> {
  const response = await fetch(`${CCIP_API}/messages?sourceTransactionHash=${sourceTx}`);
  if (!response.ok) return null;
  const { data } = (await response.json()) as {
    data: { messageId: Hex; status: string; receiptTransactionHash?: Hex | null }[];
  };
  const message = data?.[0];
  if (!message) return null;
  return {
    stage: ccipStage(message.status),
    url: `https://ccip.chain.link/msg/${message.messageId}`,
    receiptTx: message.receiptTransactionHash ?? undefined,
  };
}

/** The Axelar GMP call made by `sourceTx`, from Axelarscan. Null until Axelarscan has indexed it. */
export async function fetchAxelarHop(sourceTx: Hex): Promise<BridgeHop | null> {
  const response = await fetch(`${AXELARSCAN_API}/gmp/searchGMP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txHash: sourceTx }),
  });
  if (!response.ok) return null;
  const { data } = (await response.json()) as {
    data: { status: string; executed?: { transactionHash?: Hex } }[];
  };
  const call = data?.[0];
  if (!call) return null;
  return {
    stage: axelarStage(call.status),
    url: `https://testnet.axelarscan.io/gmp/${sourceTx}`,
    receiptTx: call.executed?.transactionHash,
  };
}

/**
 * Every hop of a transfer's message. A relayed CCIP route has two: to the relay, then from the relay onwards,
 * where the relay's receiving transaction is the source of the second hop.
 */
export async function fetchHops(bridge: Bridge, sourceTx: Hex, relayed: boolean): Promise<BridgeHop[]> {
  if (bridge === "axelar") {
    const hop = await fetchAxelarHop(sourceTx);
    return hop ? [hop] : [];
  }
  const first = await fetchCcipHop(sourceTx);
  if (!first) return [];
  if (!relayed || first.stage !== "delivered" || !first.receiptTx) return [first];
  const second = await fetchCcipHop(first.receiptTx);
  return second ? [first, second] : [first];
}
