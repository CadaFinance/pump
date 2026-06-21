import { keccak256, stringToHex } from "viem";

export type AirdropSocialTaskInput = {
  taskType: string;
  targetUrl: string;
  isRequired?: boolean;
  sortOrder?: number;
};

export type AirdropRules = {
  title?: string;
  description?: string;
  onchain?: {
    minHoldWei?: string;
    minBuyBnbWei?: string;
  };
  social?: AirdropSocialTaskInput[];
};

export function hashAirdropRules(rules: AirdropRules): `0x${string}` {
  return keccak256(stringToHex(JSON.stringify(rules)));
}
