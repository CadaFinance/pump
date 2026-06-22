"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { isPumpAuthConfigured } from "@/lib/auth-config";
import { wagmiConfig } from "@/lib/wagmi";
import { PumpWalletProvider, PumpWalletProviderStub } from "@/components/wallet/PumpWalletProvider";
import { PumpWagmiSetup } from "@/components/wallet/PumpWagmiSetup";
import { WalletFundingProvider } from "@/components/wallet/WalletFundingProvider";

function MissingAuthConfig({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] p-2">
        <p className="notice-warning pointer-events-auto text-center text-caption">
          Configure at least one sign-in provider: Telegram (
          <code className="font-mono">NEXT_PUBLIC_TELEGRAM_OIDC_CLIENT_ID</code>), Google (
          <code className="font-mono">NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID</code>), or Apple (
          <code className="font-mono">NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID</code>).
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

  if (!isPumpAuthConfigured()) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          <PumpWalletProviderStub>
            <WalletFundingProvider>
              <MissingAuthConfig>{children}</MissingAuthConfig>
            </WalletFundingProvider>
          </PumpWalletProviderStub>
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
        <PumpWalletProvider>
          <PumpWagmiSetup />
          <WalletFundingProvider>{children}</WalletFundingProvider>
        </PumpWalletProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
