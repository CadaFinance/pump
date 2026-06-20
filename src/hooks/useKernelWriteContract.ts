"use client";

import { useCallback, useState } from "react";
import type { Abi, Address, Hash } from "viem";
import { encodeFunctionData } from "viem";
import { usePumpWallet } from "@/components/wallet/PumpWalletProvider";
import { pumpChain } from "@/config/chain";
import { tradeBundlerLog } from "@/lib/aa/bundler-debug";

export type KernelWriteContractParams = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: number;
};

/** Kernel SCW writes — bypasses wagmi eth_sendTransaction (invalid UserOp fields). */
export function useKernelWriteContract() {
  const { kernelClient } = usePumpWallet();
  const [data, setData] = useState<Hash | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsPending(false);
  }, []);

  const writeContract = useCallback(
    (params: KernelWriteContractParams) => {
      if (!kernelClient) {
        setError(new Error("Sign in to trade."));
        return;
      }

      setIsPending(true);
      setError(null);

      void (async () => {
        try {
          if (!kernelClient.account) {
            throw new Error("Smart account not ready.");
          }
          tradeBundlerLog("sendTransaction start", {
            scw: kernelClient.account.address,
            to: params.address,
            fn: params.functionName,
            value: params.value?.toString() ?? "0",
          });
          const hash = await kernelClient.sendTransaction({
            account: kernelClient.account,
            chain: pumpChain,
            to: params.address,
            data: encodeFunctionData({
              abi: params.abi,
              functionName: params.functionName,
              args: params.args,
            }),
            value: params.value ?? 0n,
          });
          tradeBundlerLog("sendTransaction done", { txHash: hash });
          setData(hash);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          tradeBundlerLog("sendTransaction failed", { message: error.message });
          setError(error);
        } finally {
          setIsPending(false);
        }
      })();
    },
    [kernelClient]
  );

  return { writeContract, data, isPending, reset, error };
}
