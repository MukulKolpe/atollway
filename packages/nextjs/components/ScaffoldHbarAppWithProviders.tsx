"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { useTheme } from "next-themes";
import { WagmiProvider } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-hbar";
import { Toaster } from "~~/components/ui/sonner";
import { TooltipProvider } from "~~/components/ui/tooltip";
import { hederaTestnet } from "~~/scaffold.config";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldHbarApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="relative flex min-h-screen flex-col">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-lagoon" />
        <Header />
        <main className="relative flex flex-1 flex-col">{children}</main>
        <Footer />
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// RainbowKit's dialogs, in the app's teal.
const rainbowKitThemes = {
  light: lightTheme({ accentColor: "#0e8a97", borderRadius: "large", overlayBlur: "small" }),
  dark: darkTheme({
    accentColor: "#5ad8d0",
    accentColorForeground: "#0b1d2a",
    borderRadius: "large",
    overlayBlur: "small",
  }),
};

export const ScaffoldHbarAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rainbowKitTheme = mounted && resolvedTheme === "dark" ? rainbowKitThemes.dark : rainbowKitThemes.light;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ProgressBar height="2px" color="#2bb3b1" options={{ showSpinner: false }} shallowRouting />
        <RainbowKitProvider avatar={BlockieAvatar} initialChain={hederaTestnet} theme={rainbowKitTheme}>
          <TooltipProvider delayDuration={150}>
            <ScaffoldHbarApp>{children}</ScaffoldHbarApp>
          </TooltipProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
