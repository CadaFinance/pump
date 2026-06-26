"use client";

import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { useScwBalanceSync } from "@/hooks/useScwBalance";

/** Keeps header SCW balance fresh after deposits (any page) without per-block RPC. */
export function ScwBalanceSync() {
  const { scwAddress, authenticated } = usePumpWallet();
  useScwBalanceSync(authenticated ? scwAddress : undefined);
  return null;
}
