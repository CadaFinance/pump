"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { pumpChain } from "@/config/chain";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Pump",
  projectId,
  chains: [pumpChain],
  transports: {
    [pumpChain.id]: http(pumpChain.rpcUrls.default.http[0]),
  },
  ssr: true,
});
