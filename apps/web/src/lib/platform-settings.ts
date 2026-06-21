import { parseEther } from "viem";

export const PLATFORM_SETTING_MIN_INITIAL_BUY_BNB = "min_initial_buy_bnb";
export const DEFAULT_MIN_INITIAL_BUY_BNB = "0.01";
export const MAX_MIN_INITIAL_BUY_BNB = "1000";

/** Validates and normalizes a BNB amount string for min initial buy. */
export function normalizeMinInitialBuyBnb(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Minimum initial buy is required");
  }

  let wei: bigint;
  try {
    wei = parseEther(trimmed);
  } catch {
    throw new Error("Enter a valid BNB amount");
  }

  if (wei <= 0n) {
    throw new Error("Minimum initial buy must be greater than 0");
  }

  const maxWei = parseEther(MAX_MIN_INITIAL_BUY_BNB);
  if (wei > maxWei) {
    throw new Error(`Maximum allowed minimum is ${MAX_MIN_INITIAL_BUY_BNB} BNB`);
  }

  return trimmed;
}
