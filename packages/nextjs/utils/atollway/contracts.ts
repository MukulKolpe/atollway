import { Address, parseAbi } from "viem";
import atollwayConfig from "~~/atollway.config";
import deployedContracts from "~~/contracts/deployedContracts";
import { GenericContractsDeclaration } from "~~/utils/scaffold-hbar/contract";

const deployed = deployedContracts as GenericContractsDeclaration;
const hubContracts = deployedContracts[atollwayConfig.hubChainId];

/** The hub on Hedera, from the deployments that `yarn foundry:deploy` records. */
export const hub = {
  address: hubContracts.AtollwayHub.address as Address,
  abi: hubContracts.AtollwayHub.abi,
  chainId: atollwayConfig.hubChainId,
} as const;

/**
 * The part of the spoke gateway the app uses. It is written out rather than taken from `deployedContracts.ts`,
 * so the app still compiles before any spoke is deployed.
 */
export const spokeGatewayAbi = parseAbi([
  "function token() view returns (address)",
  "function hubPaused() view returns (bool)",
  "function guardianPaused() view returns (bool)",
  "function statusOf(address account) view returns (uint8)",
  "function sequenceOf(address account) view returns (uint64)",
  "function minted(bytes32 transferId) view returns (bool)",
  "function quoteSendToHub() view returns (uint256)",
  "function sendToHub(uint256 amount) payable returns (bytes32 transferId)",
  "event SentToHub(bytes32 indexed transferId, address indexed investor, uint256 amount)",
  "error NotApproved(address account)",
  "error SpokePaused()",
  "error InsufficientFee(uint256 required, uint256 provided)",
  "error ZeroAmount()",
  "error TransportNotSet()",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
]);

/** The spoke gateway on `chainId`, if one is deployed there. */
export function spokeGatewayAddress(chainId: number): Address | undefined {
  return deployed[chainId]?.SpokeGateway?.address as Address | undefined;
}

export type Bridge = "axelar" | "ccip";

/** The bridge a spoke uses, from the transport contract deployed next to its gateway. */
export function bridgeOf(chainId: number): Bridge | undefined {
  const contracts = deployed[chainId] ?? {};
  if (contracts.AxelarTransport) return "axelar";
  if (contracts.CcipTransport) return "ccip";
  return undefined;
}

export const BRIDGE_NAMES: Record<Bridge, string> = {
  axelar: "Axelar",
  ccip: "Chainlink CCIP",
};

/** The investor statuses of `contracts/common/InvestorStatus.sol`, in order. */
export const INVESTOR_STATUS = ["None", "Approved", "Frozen", "Revoked"] as const;

/** HTS tokens expose an ERC-20 interface, plus association from HIP-719. */
export const htsTokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function associate() returns (int64 responseCode)",
]);

/** The ERC-20 mirror that each spoke gateway deploys. */
export const spokeTokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);

/** Chainlink's price feed interface. */
export const aggregatorAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);
