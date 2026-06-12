import { bnbToUsd } from "@/lib/format-usd";

type AirdropRewardMeta = {
  rewardToken: string | null;
  rewardSymbol?: string | null;
  rewardPriceBnb?: string | null;
  totalFunded: string;
};

export function rewardAssetLabel(item: Pick<AirdropRewardMeta, "rewardToken" | "rewardSymbol">): string {
  if (!item.rewardToken) return "BNB";
  return item.rewardSymbol ? `$${item.rewardSymbol}` : "Token";
}

export function airdropRewardUsd(
  item: AirdropRewardMeta,
  bnbUsd: number | null | undefined
): number | null {
  const amount = Number(item.totalFunded);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // Token rewards: amount × price-in-BNB × BNB/USD (pairs trade against BNB).
  if (!item.rewardToken) return bnbToUsd(amount, bnbUsd);
  const priceBnb = Number(item.rewardPriceBnb);
  if (!Number.isFinite(priceBnb) || priceBnb <= 0 || bnbUsd == null) return null;
  return amount * priceBnb * bnbUsd;
}

export function formatAirdropReward(
  value: string,
  opts: { isBnb: boolean; symbol?: string | null }
): string {
  const compact = formatAirdropRewardCompact(value);
  if (opts.isBnb) return `${compact} BNB`;
  if (opts.symbol) return `${compact} $${opts.symbol}`;
  return `${compact} tokens`;
}

export function formatAirdropRewardCompact(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatTimeRemaining(endIso: string): string {
  const ms = new Date(endIso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Ended";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m left`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function formatDurationUntil(startIso: string): string {
  const ms = new Date(startIso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Started";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `in ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d}d ${h % 24}h`;
}

export function qualifyWindowProgress(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.min(100, ((now - start) / (end - start)) * 100);
}

export function formatQualifyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatQualifyDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isEndingSoon(endIso: string, withinHours = 48): boolean {
  const ms = new Date(endIso).getTime() - Date.now();
  return Number.isFinite(ms) && ms > 0 && ms <= withinHours * 60 * 60 * 1000;
}
