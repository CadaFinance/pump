import { formatPumpSubscriptPrice } from "@/lib/candles";

/** Default meme total supply on bonding curves. */
export const DEFAULT_TOKEN_TOTAL_SUPPLY = 1_000_000_000;

export function formatUsd(
  value: number | null | undefined,
  opts?: { compact?: boolean }
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (opts?.compact && value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (opts?.compact && value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(2)}`;
}

export function formatUsdReadable(
  value: number | null | undefined,
  opts?: { compact?: boolean; signed?: boolean; fallback?: string }
): string {
  if (value == null || !Number.isFinite(value)) return opts?.fallback ?? "—";

  const abs = Math.abs(value);
  const sign = opts?.signed ? (value > 0 ? "+" : value < 0 ? "-" : "") : value < 0 ? "-" : "";

  if (opts?.compact && abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (opts?.compact && abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  if (opts?.compact && abs > 0) return `${sign}${formatPumpSubscriptPrice(abs, "$")}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs > 0) {
    const decimals =
      abs >= 0.001 ? 6 :
      abs >= 0.0001 ? 7 :
      abs >= 0.00001 ? 8 :
      abs >= 0.000001 ? 9 : 10;
    return `${sign}$${abs.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "")}`;
  }

  return "$0";
}

export function bnbToUsd(bnbAmount: number, bnbUsd: number | null | undefined): number | null {
  if (bnbUsd == null || !Number.isFinite(bnbAmount) || bnbAmount <= 0) return null;
  const usd = bnbAmount * bnbUsd;
  return Number.isFinite(usd) ? usd : null;
}

export function formatBnbWithUsd(
  bnbAmount: number,
  bnbUsd: number | null | undefined,
  opts?: { compact?: boolean }
): { bnb: string; usd: string | null } {
  const bnb =
    bnbAmount >= 1_000
      ? `${bnbAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} BNB`
      : `${bnbAmount.toFixed(bnbAmount >= 1 ? 4 : 6)} BNB`;

  const usdValue = bnbToUsd(bnbAmount, bnbUsd);
  return { bnb, usd: usdValue != null ? formatUsd(usdValue, opts) : null };
}

export function tokenPriceUsd(priceBnb: number, bnbUsd: number | null | undefined): number | null {
  if (bnbUsd == null || !Number.isFinite(priceBnb) || priceBnb <= 0) return null;
  const usd = priceBnb * bnbUsd;
  return Number.isFinite(usd) ? usd : null;
}

export function estimateFdvUsd(
  priceBnb: number,
  bnbUsd: number | null | undefined,
  totalSupply = DEFAULT_TOKEN_TOTAL_SUPPLY
): number | null {
  return tokenPriceUsd(priceBnb * totalSupply, bnbUsd);
}
