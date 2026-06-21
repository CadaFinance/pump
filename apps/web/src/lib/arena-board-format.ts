import {
  formatUsdReadable,
  tokenPriceUsd,
  DEFAULT_TOKEN_TOTAL_SUPPLY,
  USD_COMPACT_K_THRESHOLD,
} from "@/lib/format-usd";

export function formatAge(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const d = Math.max(0, Math.floor(ms / 86_400_000));
  if (d >= 365) return `${Math.floor(d / 365)}y`;
  if (d >= 30) return `${Math.floor(d / 30)}mo`;
  if (d >= 1) return `${d}d`;
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  if (h >= 1) return `${h}h`;
  const m = Math.max(0, Math.floor(ms / 60_000));
  return `${m}m`;
}

export function formatSignedPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.abs(value).toFixed(2)}%`;
}

/** @deprecated Use `<PctChange />` in UI. String helper for non-React surfaces. */
export function formatPctWithTriangle(value: number | null): string {
  return formatSignedPct(value);
}

export function listTokenPriceUsd(
  marketCapBnb: string,
  bnbUsd: number | null | undefined
): number | null {
  const mcapBnb = Number(marketCapBnb);
  if (!Number.isFinite(mcapBnb) || mcapBnb <= 0 || bnbUsd == null) return null;
  const priceBnb = mcapBnb / DEFAULT_TOKEN_TOTAL_SUPPLY;
  return tokenPriceUsd(priceBnb, bnbUsd);
}

export function formatExploreListPrice(
  marketCapBnb: string,
  bnbUsd: number | null | undefined
): string {
  const priceUsd = listTokenPriceUsd(marketCapBnb, bnbUsd);
  return formatExplorePriceUsd(priceUsd);
}

export function formatExplorePriceUsd(priceUsd: number | null | undefined): string {
  return formatUsdReadable(priceUsd, { compact: true });
}

export function formatExploreMcapLabel(mcapUsd: number | null): string {
  const cap = formatCapForBoard(mcapUsd);
  if (cap === "—") return cap;
  return `${cap} MKT CAP`;
}

export function pctTone(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "text-pump-muted";
  return value >= 0 ? "text-pump-success" : "text-pump-danger";
}

export function formatCapForBoard(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= USD_COMPACT_K_THRESHOLD) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(1)}`;
  return formatUsdReadable(value);
}
