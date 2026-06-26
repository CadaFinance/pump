"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useBalance } from "wagmi";
import { pumpChain, NATIVE_SYMBOL } from "@/config/chain";
import { toast } from "@/lib/toast";
import {
  formatNativeDelta,
  invalidateScwBalance,
  isScwDepositWatchActive,
  SCW_BALANCE_IDLE_POLL_MS,
  SCW_BALANCE_INVALIDATE_EVENT,
  SCW_DEPOSIT_WATCH_EVENT,
  SCW_DEPOSIT_WATCH_POLL_MS,
  stopScwDepositWatch,
  subscribeScwBalanceInvalidate,
} from "@/lib/scw-balance-sync";

function useDepositWatchActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isScwDepositWatchActive());
    sync();
    window.addEventListener(SCW_DEPOSIT_WATCH_EVENT, sync);
    window.addEventListener("focus", sync);
    const timer = setInterval(sync, 2_000);
    return () => {
      window.removeEventListener(SCW_DEPOSIT_WATCH_EVENT, sync);
      window.removeEventListener("focus", sync);
      clearInterval(timer);
    };
  }, []);

  return active;
}

/** Shared SCW native balance query — same cache as TradePanel / header. */
export function useScwBalance(address?: Address) {
  const depositWatchActive = useDepositWatchActive();

  return useBalance({
    address,
    chainId: pumpChain.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: depositWatchActive ? SCW_DEPOSIT_WATCH_POLL_MS : SCW_BALANCE_IDLE_POLL_MS,
      refetchOnWindowFocus: true,
    },
  });
}

/**
 * Global balance sync: refetch on trade/withdraw, detect deposits during watch window, toast.
 * Mount once near app root (Web3Provider).
 */
export function useScwBalanceSync(address?: Address) {
  const depositWatchActive = useDepositWatchActive();
  const { data, refetch } = useScwBalance(address);
  const prevBalanceRef = useRef<bigint | null>(null);

  const refetchBalance = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    return subscribeScwBalanceInvalidate(refetchBalance);
  }, [refetchBalance]);

  useEffect(() => {
    const onInvalidate = () => refetchBalance();
    window.addEventListener(SCW_BALANCE_INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(SCW_BALANCE_INVALIDATE_EVENT, onInvalidate);
  }, [refetchBalance]);

  useEffect(() => {
    prevBalanceRef.current = null;
  }, [address]);

  useEffect(() => {
    if (!address || data?.value == null) return;

    const prev = prevBalanceRef.current;
    if (
      prev != null &&
      data.value > prev &&
      depositWatchActive
    ) {
      const delta = data.value - prev;
      toast.success(
        "Deposit received",
        `+${formatNativeDelta(delta)} ${NATIVE_SYMBOL} added to your smart wallet.`
      );
      stopScwDepositWatch();
      invalidateScwBalance();
    }

    prevBalanceRef.current = data.value;
  }, [address, data?.value, depositWatchActive]);
}
