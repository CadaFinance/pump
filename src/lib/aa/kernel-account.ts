import {
  createKernelAccountClient,
  type KernelAccountClient,
} from "@zerodev/sdk";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import {
  createPublicClient,
  http,
  parseGwei,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { contracts, pumpChain, rpcUrl } from "@/config/chain";
import { createBundlerTransport } from "@/lib/aa/bundler-transport";
import { assertScwReadyForUserOp } from "@/lib/aa/scw-preflight";

export const entryPoint = getEntryPoint("0.7");
export const kernelVersion = KERNEL_V3_1;

/** BSC often reports sub-1 gwei; bundler rejects UserOps below 1 gwei maxFee. */
const MIN_MAX_FEE_PER_GAS = parseGwei("1");
const MIN_PRIORITY_FEE_PER_GAS = parseGwei("0.05");

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function createPumpPublicClient(): PublicClient {
  return createPublicClient({
    chain: pumpChain,
    transport: http(rpcUrl),
  });
}

function createKernelUserOperationConfig(publicClient: PublicClient) {
  return {
    estimateFeesPerGas: async () => {
      const gasPrice = await publicClient.getGasPrice();
      return {
        maxFeePerGas: maxBigInt(gasPrice, MIN_MAX_FEE_PER_GAS),
        maxPriorityFeePerGas: maxBigInt(gasPrice / 10n, MIN_PRIORITY_FEE_PER_GAS),
      };
    },
  };
}

export function createKernelClientFromAccount(
  account: NonNullable<KernelAccountClient["account"]>,
  publicClient: PublicClient
): KernelAccountClient {
  return createKernelAccountClient({
    account,
    chain: pumpChain,
    bundlerTransport: createBundlerTransport(),
    client: publicClient,
    userOperation: createKernelUserOperationConfig(publicClient),
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
