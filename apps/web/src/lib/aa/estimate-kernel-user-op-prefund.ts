import type { KernelAccountClient } from "@zerodev/sdk";
import { prepareUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";
import type { Address, Hex } from "viem";
import { createKernelTradeClients } from "@/lib/aa/kernel-trade-clients";
import { userOpPrefundFromPreparedLimits } from "@/lib/aa/user-op-prefund";

export type KernelUserOpCall = {
  to: Address;
  data?: Hex;
  value?: bigint;
};

/**
 * Prefund for a Kernel UserOp via the same prepare path as submit (Alto estimate + Kernel bumps + trade gas tier).
 */
export async function estimateKernelUserOpPrefundWei(
  kernelClient: KernelAccountClient,
  call: KernelUserOpCall,
  options?: { tradeGas?: boolean }
): Promise<bigint> {
  if (!kernelClient.account) {
    throw new Error("Smart account not ready.");
  }

  const client =
    options?.tradeGas === false
      ? kernelClient
      : createKernelTradeClients(kernelClient).kernelClient;

  const account = client.account;
  if (!account) {
    throw new Error("Smart account not ready.");
  }

  const userOp = await getAction(client, prepareUserOperation, "prepareUserOperation")({
    account,
    calls: [
      {
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      },
    ],
  });

  const maxFeePerGas = userOp.maxFeePerGas ?? 0n;
  return userOpPrefundFromPreparedLimits(
    {
      verificationGasLimit: userOp.verificationGasLimit ?? 0n,
      callGasLimit: userOp.callGasLimit ?? 0n,
      preVerificationGas: userOp.preVerificationGas ?? 0n,
    },
    maxFeePerGas
  );
}
