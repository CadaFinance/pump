"use client";

import { useAccount } from "wagmi";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";

/** Telegram-authenticated Pump session — never treat browser extension wallets as signed in. */
export function usePumpSession() {
  const { ready, authenticated, scwAddress, login } = usePumpWallet();
  const { isConnected, address, chain } = useAccount();

  const signedIn =
    ready &&
    authenticated &&
    Boolean(scwAddress) &&
    isConnected &&
    address?.toLowerCase() === scwAddress?.toLowerCase();

  return {
    ready,
    authenticated,
    signedIn,
    scwAddress,
    login,
    chain,
  };
}
