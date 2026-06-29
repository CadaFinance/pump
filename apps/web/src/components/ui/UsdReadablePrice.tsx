import { PumpSubscriptPrice } from "@/components/ui/PumpSubscriptPrice";
import {
  formatUsdReadable,
  type FormatUsdReadableOptions,
  USD_COMPACT_K_THRESHOLD,
} from "@/lib/format-usd";

type UsdReadablePriceProps = FormatUsdReadableOptions & {
  value: number | null | undefined;
  className?: string;
};

/** True when compact USD should use pump HTML subscript (not K/M / $1+). */
export function shouldUsePumpSubscriptUsd(
  value: number,
  opts?: Pick<FormatUsdReadableOptions, "compact" | "twoDecimalsUnder">
): boolean {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs <= 0) return false;
  if (!opts?.compact) return abs < 0.01;
  if (abs >= 1_000_000) return false;
  if (abs >= USD_COMPACT_K_THRESHOLD) return false;
  if (opts.twoDecimalsUnder != null && abs >= 1 && abs < opts.twoDecimalsUnder) return false;
  if (abs >= 1) return false;
  return true;
}

/** USD display — PumpSubscriptPrice for tiny meme prices, plain text otherwise. */
export function UsdReadablePrice({
  value,
  className = "",
  compact,
  signed,
  fallback,
  twoDecimalsUnder,
}: UsdReadablePriceProps) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={className}>{fallback ?? "—"}</span>;
  }

  const opts: FormatUsdReadableOptions = { compact, signed, fallback, twoDecimalsUnder };
  const plain = formatUsdReadable(value, opts);

  if (shouldUsePumpSubscriptUsd(value, opts)) {
    const abs = Math.abs(value);
    const sign = signed ? (value > 0 ? "+" : value < 0 ? "-" : "") : value < 0 ? "-" : "";
    const fullDecimal = formatUsdReadable(value, { ...opts, compact: false });
    return (
      <PumpSubscriptPrice
        value={abs}
        prefix={`${sign}$`}
        className={className}
        title={fullDecimal}
      />
    );
  }

  return (
    <span className={className} title={plain}>
      {plain}
    </span>
  );
}
