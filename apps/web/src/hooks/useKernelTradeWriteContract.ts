"use client";

import { useCallback, useState } from "react";
import type { Abi, Address, Hash, TransactionReceipt } from "viem";
import { encodeFunctionData } from "viem";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { isTradeFlashblocksActive } from "@/config/flashblocks";
import { tradeBundlerLog } from "@/lib/aa/bundler-debug";
import { resolveTradeKernelClients } from "@/lib/aa/kernel-trade-clients";
import {
  sendKernelTransaction,
  type KernelTransactionResult,
} from "@/lib/aa/send-kernel-transaction";

export type KernelTradeWriteParams = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: number;
};

/**
 * Buy/sell only — trade HTTPS RPC for UserOp prepare + WSS Flashblocks confirm.
 * Returns receipt in the same tick as txHash (no second wagmi waiter).
 */
export function useKernelTradeWriteContract() {
  const { kernelClient } = usePumpWallet();
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [receipt, setReceipt] = useState<TransactionReceipt | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setTxHash(undefined);
    setReceipt(undefined);
    setError(null);
    setIsPending(false);
  }, []);

  const tradeWrite = useCallback(
    (params: KernelTradeWriteParams) => {
      if (!kernelClient) {
        setError(new Error("Sign in to trade."));
        return;
      }

      setIsPending(true);
      setError(null);
      setReceipt(undefined);

      void (async () => {
        const t0 = performance.now();
        try {
          if (!kernelClient.account) {
            throw new Error("Smart account not ready.");
          }

          const flashblocks = isTradeFlashblocksActive();
          const { kernelClient: activeClient, publicClient } = resolveTradeKernelClients(
            kernelClient,
            flashblocks
          );

          tradeBundlerLog("tradeWrite start", {
            scw: activeClient.account!.address,
            to: params.address,
            fn: params.functionName,
            flashblocks,
          });

          const result: KernelTransactionResult = await sendKernelTransaction(
            activeClient,
            publicClient,
            {
              to: params.address,
              data: encodeFunctionData({
                abi: params.abi,
                functionName: params.functionName,
                args: params.args,
              }),
              value: params.value ?? 0n,
            },
            { flashblocks }
          );

          tradeBundlerLog("tradeWrite done", {
            txHash: result.hash,
            hasReceipt: Boolean(result.receipt),
            ms: Math.round(performance.now() - t0),
          });

          setTxHash(result.hash);
          if (result.receipt) {
            setReceipt(result.receipt);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          tradeBundlerLog("tradeWrite failed", {
            message: error.message,
            ms: Math.round(performance.now() - t0),
          });
          setError(error);
        } finally {
          setIsPending(false);
        }
      })();
    },
    [kernelClient]
  );

  return { tradeWrite, txHash, receipt, isPending, reset, error };
}
