"use client";

import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc, bscTestnet } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "@wagmi/core";
import { http } from "wagmi";
import { CHAIN_ID, rpcUrl } from "@/config/chain";
import { getAppKitThemeOptions } from "@/lib/appkit-theme";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3012";

export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000";

export const metadata = {
  name: "Pump",
  description: "Launch, trade, and earn on BSC bonding curves.",
  url: appUrl,
  icons: [`${appUrl}/opengraph-image`],
};

export const pumpAppKitNetwork = CHAIN_ID === 56 ? bsc : bscTestnet;

export const appKitNetworks = [pumpAppKitNetwork] as [typeof pumpAppKitNetwork, ...typeof pumpAppKitNetwork[]];

const initialTheme = getAppKitThemeOptions("slate");

type AppKitGlobal = typeof globalThis & {
  __pumpWagmiAdapter?: WagmiAdapter;
};

const globalStore = globalThis as AppKitGlobal;

function createWagmiAdapter() {
  return new WagmiAdapter({
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
    projectId,
    networks: appKitNetworks,
    transports: {
      [pumpAppKitNetwork.id]: http(rpcUrl),
    },
  });
}

/** Reuse adapter across Fast Refresh to avoid duplicate WalletConnect instances in dev. */
export const wagmiAdapter =
  globalStore.__pumpWagmiAdapter ?? (globalStore.__pumpWagmiAdapter = createWagmiAdapter());

export const wagmiConfig = wagmiAdapter.wagmiConfig;

/** Must run at module load (SSR + client) before any AppKit hooks. */
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: appKitNetworks,
  defaultNetwork: pumpAppKitNetwork,
  metadata,
  themeMode: initialTheme.themeMode,
  themeVariables: initialTheme.themeVariables,
  features: {
    analytics: true,
    history: true,
    onramp: true,
    swaps: false,
    email: true,
    socials: ["google", "x", "discord", "github", "apple", "facebook"],
    emailShowWallets: true,
    connectMethodsOrder: ["email", "social", "wallet"],
  },
});

/** No-op helper kept for callers; AppKit is initialized at module load. */
export function ensureAppKit() {}
