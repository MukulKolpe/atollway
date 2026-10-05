import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { getParsedError } from "~~/utils/scaffold-hbar";

/** Hedera response codes that the hub passes on in `HederaCallFailed`. */
const HEDERA_CODES: Record<number, string> = {
  165: "The account is frozen for this token.",
  176: "The account is not approved for this token.",
  184: "The account has not linked the token yet.",
  265: "The token is paused.",
};

const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  NotApproved: () => "This address is not approved by the issuer.",
  InsufficientFee: () => "The bridge fee changed while you were signing. Please try again.",
  CapExceeded: () => "That would put the spoke over its supply cap.",
  TooFewShares: () => "The HBAR price moved while you were signing. Please try again.",
  StalePrice: () => "The Chainlink price is too old, so subscriptions wait for its next update.",
  SubscriptionsClosed: () => "The issuer has closed subscriptions.",
  SpokePaused: () => "This chain is paused.",
  InsufficientBalance: () => "There are not enough shares on this chain.",
  ERC20InsufficientBalance: () => "There are not enough shares on this chain.",
  ExceedsOutstanding: () => "The spoke does not hold that many shares.",
  ZeroAmount: () => "Enter an amount above zero.",
  InvalidStatusChange: () => "That change is not possible from the investor's current status.",
  OwnableUnauthorizedAccount: () => "Only the issuer can do this.",
  SpokeDisconnected: () => "This spoke is disconnected from the hub.",
  HederaCallFailed: args => HEDERA_CODES[Number(args[1])] ?? `Hedera returned response code ${args[1]}.`,
};

/**
 * A short, plain sentence for a failed transaction.
 */
export function describeError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk(e => e instanceof UserRejectedRequestError)) return "You cancelled the request in your wallet.";
    const reverted = error.walk(e => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName) {
      const message = MESSAGES[reverted.data.errorName];
      if (message) return message(reverted.data.args ?? []);
    }
  }
  return getParsedError(error);
}
