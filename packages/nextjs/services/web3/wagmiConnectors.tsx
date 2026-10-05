import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import scaffoldConfig from "~~/scaffold.config";

/**
 * Wallets offered in the connect dialog. Atollway needs a wallet that signs on Hedera and on every spoke chain,
 * so it offers MetaMask and WalletConnect. Other browser wallets show up automatically (EIP-6963).
 */
export const wagmiConnectors = () => {
  if (typeof window === "undefined") {
    return [];
  }

  return connectorsForWallets(
    [
      {
        groupName: "Supported wallets",
        wallets: [metaMaskWallet, walletConnectWallet],
      },
    ],
    {
      appName: "Atollway",
      projectId: scaffoldConfig.walletConnectProjectId,
    },
  );
};
