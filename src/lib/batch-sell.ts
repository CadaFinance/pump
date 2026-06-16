import type { Address } from "viem";
import { parseSignature } from "viem";
import { buildPermitTypedData, permitDeadline } from "@/lib/erc20-permit";

export const MAX_SELL_BATCH = 10;

export type BatchSellItem = {
  tokenAddress: Address;
  tokenIn: bigint;
  minZugOut: bigint;
  permit?: {
    deadline: bigint;
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
  };
};

type PermitSignInput = {
  tokenName: string;
  tokenAddress: Address;
  tokenIn: bigint;
  minZugOut: bigint;
  permitNonce: bigint;
  owner: Address;
  spender: Address;
  chainId: number;
  signTypedDataAsync: (args: ReturnType<typeof buildPermitTypedData>) => Promise<`0x${string}`>;
};

export async function signBatchSellPermitItem(
  input: PermitSignInput
): Promise<BatchSellItem> {
  const deadline = permitDeadline();
  const signature = await input.signTypedDataAsync(
    buildPermitTypedData({
      tokenName: input.tokenName,
      tokenAddress: input.tokenAddress,
      chainId: input.chainId,
      owner: input.owner,
      spender: input.spender,
      value: input.tokenIn,
      nonce: input.permitNonce,
      deadline,
    })
  );
  const parsed = parseSignature(signature);
  const permitV =
    parsed.yParity !== undefined ? parsed.yParity + 27 : Number(parsed.v ?? 27);

  return {
    tokenAddress: input.tokenAddress,
    tokenIn: input.tokenIn,
    minZugOut: input.minZugOut,
    permit: {
      deadline,
      v: permitV,
      r: parsed.r,
      s: parsed.s,
    },
  };
}

export function batchSellWriteArgs(items: BatchSellItem[]) {
  const needsPermit = items.some((item) => item.permit);
  if (needsPermit) {
    return {
      functionName: "sellBatchWithPermit" as const,
      args: [
        items.map((item) => ({
          token: item.tokenAddress,
          tokenIn: item.tokenIn,
          minZugOut: item.minZugOut,
          deadline: item.permit!.deadline,
          v: item.permit!.v,
          r: item.permit!.r,
          s: item.permit!.s,
        })),
      ],
    };
  }

  return {
    functionName: "sellBatch" as const,
    args: [
      items.map((item) => ({
        token: item.tokenAddress,
        tokenIn: item.tokenIn,
        minZugOut: item.minZugOut,
      })),
    ],
  };
}
