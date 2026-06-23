"use client";

import { useEffect, useState } from "react";
import type { Hash, TransactionReceipt } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";
import {
  createTradeHttpPublicClient,
  FLASHBLOCKS_CONFIRMATIONS,
  FLASHBLOCKS_POLL_MS,
  isTradeFlashblocksActive,
} from "@/config/flashblocks";

type Params = {
  hash?: Hash;
  query?: { enabled?: boolean };
};

/** Trade-only receipt waiter on Alchemy Flashblocks RPC (~200ms, 0 confirmations). */
export function useFlashblocksTransactionReceipt({ hash, query }: Params) {
  const enabled = query?.enabled !== false && Boolean(hash);
  const useFast = isTradeFlashblocksActive();

  const [data, setData] = useState<TransactionReceipt | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const legacy = useWaitForTransactionReceipt({
    hash,
    query: { enabled: enabled && !useFast },
  });

  useEffect(() => {
    if (!enabled || !hash || !useFast) {
      setData(undefined);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const client = createTradeHttpPublicClient();
    setIsLoading(true);
    setError(null);

    void client
      .waitForTransactionReceipt({
        hash,
        confirmations: FLASHBLOCKS_CONFIRMATIONS,
        pollingInterval: FLASHBLOCKS_POLL_MS,
        timeout: 60_000,
      })
      .then((receipt) => {
        if (!cancelled) setData(receipt);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, hash, useFast]);

  if (useFast) {
    return {
      data,
      isLoading,
      isSuccess: Boolean(data),
      error,
    };
  }

  return legacy;
}
