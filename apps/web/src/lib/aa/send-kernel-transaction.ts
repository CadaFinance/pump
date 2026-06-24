import type { KernelAccountClient } from "@zerodev/sdk";
import { sendUserOperation } from "viem/account-abstraction";
import { getAction } from "viem/utils";
import type { Address, Hash, Hex, PublicClient, TransactionReceipt } from "viem";
import { tradeBundlerLog } from "@/lib/aa/bundler-debug";
import {
  waitForUserOpConfirmation,
  type UserOpConfirmationOptions,
} from "@/lib/aa/wait-user-op-confirmation";

export type KernelTransactionCall = {
  to: Address;
  data?: Hex;
  value?: bigint;
};

export type KernelTransactionResult = {
  hash: Hash;
  receipt?: TransactionReceipt;
};

export async function sendKernelTransaction(
  client: KernelAccountClient,
  publicClient: PublicClient,
  call: KernelTransactionCall,
  options?: UserOpConfirmationOptions
): Promise<KernelTransactionResult> {
  const account = client.account;
  if (!account) {
    throw new Error("Smart account not ready.");
  }

  const t0 = performance.now();
  const fromBlock = await publicClient.getBlockNumber();

  const userOpHash = await getAction(client, sendUserOperation, "sendUserOperation")({
    account,
    calls: [
      {
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      },
    ],
  });

  tradeBundlerLog("userOp submitted", {
    userOpHash,
    fromBlock: fromBlock.toString(),
    submitMs: Math.round(performance.now() - t0),
  });

  const confirmT0 = performance.now();
  const { txHash, receipt } = await waitForUserOpConfirmation(
    client,
    publicClient,
    userOpHash,
    fromBlock,
    options
  );

  tradeBundlerLog("userOp confirmed", {
    userOpHash,
    txHash,
    hasReceipt: Boolean(receipt),
    confirmMs: Math.round(performance.now() - confirmT0),
  });

  return { hash: txHash, receipt };
}
