"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useTheme } from "@/components/theme/ThemeProvider";
import { wagmiConfig } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { theme } = useTheme();

  const rainbowTheme =
    theme === "dark"
      ? darkTheme({
          accentColor: "#5e8bff",
          accentColorForeground: "#f5f8ff",
          borderRadius: "medium",
          fontStack: "system",
          overlayBlur: "small",
        })
      : lightTheme({
          accentColor: "#215cd6",
          accentColorForeground: "#f5f8ff",
          borderRadius: "medium",
          fontStack: "system",
          overlayBlur: "small",
        });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
