import type { Address } from "viem";
import { maxUint256 } from "viem";

export const ERC20_PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const PERMIT_DEADLINE_SEC = 20 * 60;

/** Unlimited allowance — sign once per token; later sells skip permit. */
export const PERMIT_ALLOWANCE_MAX = maxUint256;

export function buildPermitTypedData(params: {
  tokenName: string;
  tokenAddress: Address;
  chainId: number;
  owner: Address;
  spender: Address;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}) {
  return {
    domain: {
      name: params.tokenName,
      version: "1",
      chainId: params.chainId,
      verifyingContract: params.tokenAddress,
    },
    types: ERC20_PERMIT_TYPES,
    primaryType: "Permit" as const,
    message: {
      owner: params.owner,
      spender: params.spender,
      value: params.value,
      nonce: params.nonce,
      deadline: params.deadline,
    },
  };
}

export function permitDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_SEC);
}
