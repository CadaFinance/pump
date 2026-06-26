import { pumpChain } from "@/config/chain";

/** Chain native token symbol — ETH on Base / Base Sepolia. */
export const NATIVE_SYMBOL = pumpChain.nativeCurrency.symbol;

/** Sentinel for “reward in native ETH” (legacy value `__BNB__` kept for form state). */
export const NATIVE_REWARD_ASSET = "__BNB__";

/** @deprecated Use NATIVE_REWARD_ASSET */
export const BNB_REWARD_ASSET = NATIVE_REWARD_ASSET;

export function isNativeRewardAsset(value: string): boolean {
  return !value || value === NATIVE_REWARD_ASSET;
}

/** @deprecated Use isNativeRewardAsset */
export const isBnbRewardAsset = isNativeRewardAsset;

export function formatNativeAmount(
  amount: number,
  opts?: { maxDecimals?: number; suffix?: boolean }
): string {
  const suffix = opts?.suffix !== false;
  if (!Number.isFinite(amount)) return suffix ? `0 ${NATIVE_SYMBOL}` : "0";

  let formatted: string;
  if (amount >= 1_000_000) formatted = `${(amount / 1_000_000).toFixed(2)}M`;
  else if (amount >= 1_000) formatted = `${(amount / 1_000).toFixed(2)}K`;
  else if (amount >= 1) formatted = amount.toFixed(opts?.maxDecimals ?? 4);
  else if (amount >= 0.0001) formatted = amount.toFixed(4);
  else formatted = amount.toFixed(6);

  return suffix ? `${formatted} ${NATIVE_SYMBOL}` : formatted;
}

export function nativeAmountWithSymbol(amount: string | number): string {
  const trimmed = String(amount).trim();
  if (!trimmed) return NATIVE_SYMBOL;
  return `${trimmed} ${NATIVE_SYMBOL}`;
}
