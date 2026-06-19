"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { isZeroDevConfigured } from "@/lib/zerodev-config";
import { wagmiConfig } from "@/lib/wagmi";
import { PumpWalletProvider, PumpWalletProviderStub } from "@/components/wallet/PumpWalletProvider";
import { ZeroDevWagmiSetup } from "@/components/wallet/ZeroDevWagmiSetup";
import { WalletFundingProvider } from "@/components/wallet/WalletFundingProvider";

function MissingZeroDevConfig({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] p-2">
        <p className="notice-warning pointer-events-auto text-center text-caption">
          Set <code className="font-mono">NEXT_PUBLIC_ZERODEV_PROJECT_ID</code> in{" "}
          <code className="font-mono">.env</code> to enable login.
        </p>
      </div>
    </>
  );
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  if (!isZeroDevConfigured()) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <PumpWalletProviderStub>
            <WalletFundingProvider>
              <MissingZeroDevConfig>{children}</MissingZeroDevConfig>
            </WalletFundingProvider>
          </PumpWalletProviderStub>
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <PumpWalletProvider>
          <ZeroDevWagmiSetup />
          <WalletFundingProvider>{children}</WalletFundingProvider>
        </PumpWalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
