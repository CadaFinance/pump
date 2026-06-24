import type { KernelAccountClient } from "@zerodev/sdk";
import type { PublicClient } from "viem";
import {
  createKernelClientFromAccount,
  createPumpPublicClient,
} from "@/lib/aa/kernel-account";
import {
  createTradeHttpPublicClient,
  isTradeFlashblocksActive,
} from "@/config/flashblocks";

/** Kernel + HTTPS trade RPC — UserOp prepare/simulate on Alchemy (buy/sell only). */
export function createKernelTradeClients(kernelClient: KernelAccountClient): {
  kernelClient: KernelAccountClient;
  publicClient: PublicClient;
} {
  if (!kernelClient.account) {
    throw new Error("Smart account not ready.");
  }
  const publicClient = createTradeHttpPublicClient();
  const client = createKernelClientFromAccount(kernelClient.account, publicClient, {
    fastPolling: true,
    tradeGas: true,
  });
  return { kernelClient: client, publicClient };
}

export function resolveTradeKernelClients(
  kernelClient: KernelAccountClient,
  flashblocks: boolean
): { kernelClient: KernelAccountClient; publicClient: PublicClient } {
  if (flashblocks && isTradeFlashblocksActive()) {
    return createKernelTradeClients(kernelClient);
  }
  return { kernelClient, publicClient: createPumpPublicClient() };
}
