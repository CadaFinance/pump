"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { pumpChain } from "@/config/chain";
import { clearPumpConnectorSession, clearPumpWagmiPersistence } from "@/lib/wagmi";

/** Connect wagmi only after Telegram auth sets the kernel EIP-1193 provider + SCW address. */
export function PumpWagmiSetup() {
  const { authenticated, scwAddress } = usePumpWallet();
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const clearedLegacyRef = useRef(false);

  useEffect(() => {
    if (clearedLegacyRef.current) return;
    clearedLegacyRef.current = true;
    clearPumpWagmiPersistence();
  }, []);

  useEffect(() => {
    const kernelConnector = connectors.find((item) => item.id === "pump-kernel");
    if (!kernelConnector) return;

    const scw = scwAddress?.toLowerCase();
    const connected = address?.toLowerCase();

    if (!authenticated || !scw) {
      clearPumpConnectorSession();
      if (isConnected) {
        void disconnectAsync().catch(() => undefined);
      }
      return;
    }

    const needsReconnect =
      !isConnected ||
      connected !== scw ||
      (chainId != null && chainId !== pumpChain.id);

    if (!needsReconnect) return;

    let cancelled = false;

    void (async () => {
      if (isConnected) {
        await disconnectAsync().catch(() => undefined);
      }
      if (cancelled) return;
      await connect({ connector: kernelConnector });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authenticated,
    scwAddress,
    address,
    isConnected,
    chainId,
    connect,
    connectors,
    disconnectAsync,
  ]);

  return null;
}

/** @deprecated Use PumpWagmiSetup */
export const ZeroDevWagmiSetup = PumpWagmiSetup;
