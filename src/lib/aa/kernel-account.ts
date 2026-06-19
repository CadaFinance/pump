import {
  createKernelAccountClient,
  type KernelAccountClient,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { contracts, pumpChain, rpcUrl } from "@/config/chain";
import { createZeroDevBundlerTransport } from "@/lib/aa/zerodev-bundler";
import { assertScwReadyForUserOp } from "@/lib/aa/scw-preflight";

export const entryPoint = getEntryPoint("0.7");
export const kernelVersion = KERNEL_V3_1;

export function createPumpPublicClient(): PublicClient {
  return createPublicClient({
    chain: pumpChain,
    transport: http(rpcUrl),
  });
}

export function createKernelClientFromAccount(
  account: NonNullable<KernelAccountClient["account"]>,
  publicClient: PublicClient
): KernelAccountClient {
  return createKernelAccountClient({
    account,
    chain: pumpChain,
    bundlerTransport: createZeroDevBundlerTransport(),
    client: publicClient,
    userOperation: {
      estimateFeesPerGas: async () => publicClient.estimateFeesPerGas(),
    },
  });
}

export async function withdrawFromKernelClient(
  client: KernelAccountClient,
  to: Address,
  value: bigint
): Promise<Hex> {
  if (!client.account) {
    throw new Error("Smart account not ready.");
  }

  await assertScwReadyForUserOp(client.account.address, value);

  return client.sendTransaction({
    account: client.account,
    to,
    value,
    data: "0x",
    chain: pumpChain,
  } as Parameters<typeof client.sendTransaction>[0]);
}
