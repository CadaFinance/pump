"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";

/** Reconnect wagmi connector after email login sets the EIP-1193 provider. */
export function ZeroDevWagmiSetup() {
  const { authenticated, scwAddress } = usePumpWallet();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (!authenticated || !scwAddress || isConnected) return;
    const connector = connectors.find((item) => item.id === "zerodev-email");
    if (!connector) return;
    void connect({ connector });
  }, [authenticated, scwAddress, isConnected, connect, connectors]);

  return null;
}
