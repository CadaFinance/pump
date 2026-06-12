import { formatUsdReadable } from "@/lib/format-usd";

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
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function pctTone(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "text-pump-muted";
  return value >= 0 ? "text-pump-success" : "text-pump-danger";
}

export function formatCapForBoard(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs > 9_999) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(0)}`;
  return formatUsdReadable(value);
}
