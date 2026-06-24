"use client";

import { useCallback, useState } from "react";
import type { Abi, Address, Hash, TransactionReceipt } from "viem";
import { encodeFunctionData } from "viem";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { isTradeFlashblocksActive } from "@/config/flashblocks";
import { tradeBundlerLog } from "@/lib/aa/bundler-debug";
import { resolveTradeKernelClients } from "@/lib/aa/kernel-trade-clients";
import {
  confirmKernelUserOperation,
  submitKernelUserOperation,
  type KernelTransactionResult,
} from "@/lib/aa/send-kernel-transaction";
import { failTradeTrace, tradeTraceStep } from "@/lib/trade-timing";

export type KernelTradeWriteParams = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: number;
};

export type TradeWritePhase =
  | "idle"
  | "preparing"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed";

/**
 * Buy/sell only — trade HTTPS RPC for UserOp prepare + WSS Flashblocks confirm.
 * Exposes phased progress: submitted (userOpHash) before on-chain txHash.
 */
export function useKernelTradeWriteContract() {
  const { kernelClient } = usePumpWallet();
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [userOpHash, setUserOpHash] = useState<Hash | undefined>();
  const [receipt, setReceipt] = useState<TransactionReceipt | undefined>();
  const [tradePhase, setTradePhase] = useState<TradeWritePhase>("idle");
  const [error, setError] = useState<Error | null>(null);

  const isPending =
    tradePhase === "preparing" ||
    tradePhase === "submitted" ||
    tradePhase === "confirming";

  const reset = useCallback(() => {
    setTxHash(undefined);
    setUserOpHash(undefined);
    setReceipt(undefined);
    setError(null);
    setTradePhase("idle");
  }, []);

  const tradeWrite = useCallback(
    (params: KernelTradeWriteParams) => {
      if (!kernelClient) {
        setError(new Error("Sign in to trade."));
        failTradeTrace("ux.kernel_client_missing", new Error("Sign in to trade."));
        return;
      }

      setTradePhase("preparing");
      setError(null);
      setReceipt(undefined);
      setUserOpHash(undefined);
      setTxHash(undefined);
      tradeTraceStep("ux.isPending=true");
      tradeTraceStep("ux.trade_phase", { phase: "preparing" });

      void (async () => {
        const t0 = performance.now();
        try {
          if (!kernelClient.account) {
            throw new Error("Smart account not ready.");
          }

          const flashblocks = isTradeFlashblocksActive();
          tradeTraceStep("kernel.resolve_clients.start", { flashblocks });
          const { kernelClient: activeClient, publicClient } = resolveTradeKernelClients(
            kernelClient,
            flashblocks
          );
          tradeTraceStep("kernel.resolve_clients.done", {
            scw: activeClient.account!.address,
            flashblocks,
          });

          tradeBundlerLog("tradeWrite start", {
            scw: activeClient.account!.address,
            to: params.address,
            fn: params.functionName,
            flashblocks,
          });

          tradeTraceStep("chain.trade_write.invoke", {
            to: params.address,
            fn: params.functionName,
            value: params.value?.toString() ?? "0",
          });

          const call = {
            to: params.address,
            data: encodeFunctionData({
              abi: params.abi,
              functionName: params.functionName,
              args: params.args,
            }),
            value: params.value ?? 0n,
          };

          const submitResult = await submitKernelUserOperation(
            activeClient,
            publicClient,
            call
          );

          setUserOpHash(submitResult.userOpHash);
          setTradePhase("submitted");
          tradeTraceStep("ux.trade_phase", {
            phase: "submitted",
            userOpHash: submitResult.userOpHash,
          });
          tradeTraceStep("ux.user_op_submitted", { userOpHash: submitResult.userOpHash });

          setTradePhase("confirming");
          tradeTraceStep("ux.trade_phase", { phase: "confirming" });

          const result: KernelTransactionResult = await confirmKernelUserOperation(
            activeClient,
            publicClient,
            submitResult.userOpHash,
            submitResult.fromBlock,
            { flashblocks }
          );

          tradeTraceStep("chain.trade_write.returned", {
            txHash: result.hash,
            hasReceipt: Boolean(result.receipt),
            ms: Math.round(performance.now() - t0),
          });

          tradeBundlerLog("tradeWrite done", {
            txHash: result.hash,
            hasReceipt: Boolean(result.receipt),
            ms: Math.round(performance.now() - t0),
          });

          setTxHash(result.hash);
          tradeTraceStep("ux.txHash_set", { txHash: result.hash });
          if (result.receipt) {
            setReceipt(result.receipt);
            tradeTraceStep("ux.kernel_receipt_set", {
              blockNumber: result.receipt.blockNumber.toString(),
            });
          }
          setTradePhase("confirmed");
          tradeTraceStep("ux.trade_phase", { phase: "confirmed", txHash: result.hash });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          tradeBundlerLog("tradeWrite failed", {
            message: error.message,
            ms: Math.round(performance.now() - t0),
          });
          failTradeTrace("chain.trade_write.failed", error);
          setError(error);
          setTradePhase("failed");
          tradeTraceStep("ux.trade_phase", { phase: "failed", message: error.message });
        } finally {
          tradeTraceStep("ux.isPending=false");
        }
      })();
    },
    [kernelClient]
  );

  return {
    tradeWrite,
    txHash,
    userOpHash,
    receipt,
    tradePhase,
    isPending,
    reset,
    error,
  };
}
