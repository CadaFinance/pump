/**
 * Spot / Quote / Fill price semantics — see `.cursor/docs/price-accuracy-contract.md`.
 */

export type PriceSurface = "spot" | "quote" | "fill";

/** UI prefix for estimated (pre-execution) prices. */
export const QUOTE_PRICE_PREFIX = "Est.";

/** Average execution price from a curve quote (BNB per token, human units). */
export function quoteFillPriceBnb(
  spendBnb: number,
  receiveTokens: number
): number | null {
  if (
    !Number.isFinite(spendBnb) ||
    !Number.isFinite(receiveTokens) ||
    spendBnb <= 0 ||
    receiveTokens <= 0
  ) {
    return null;
  }
  return spendBnb / receiveTokens;
}

export function formatEstimatedPriceUsd(
  priceUsd: number | null | undefined,
  formatUsd: (value: number) => string | null
): string | null {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) return null;
  const formatted = formatUsd(priceUsd);
  if (!formatted) return null;
  return `${QUOTE_PRICE_PREFIX} ~${formatted}`;
}
