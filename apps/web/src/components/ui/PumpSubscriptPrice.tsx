import {
  formatPumpSubscriptPriceFull,
  parsePumpSubscriptPriceParts,
} from "@/lib/candles";

type PumpSubscriptPriceProps = {
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Tooltip / screen-reader hint with full decimal price */
  title?: string;
};

/** Visible pump-style tiny price: $0.0<sub>5</sub>79 (HTML sub, not Unicode ₅). */
export function PumpSubscriptPrice({
  value,
  prefix = "$",
  suffix = "",
  className = "",
  title,
}: PumpSubscriptPriceProps) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={className}>—</span>;
  }

  const parts = parsePumpSubscriptPriceParts(value, prefix);
  const fullPrice = title ?? formatPumpSubscriptPriceFull(value, prefix) + suffix;

  if (parts.kind === "plain") {
    return (
      <span className={`pump-subscript-price ${className}`.trim()} title={fullPrice}>
        {parts.text}
        {suffix}
      </span>
    );
  }

  return (
    <span
      className={`pump-subscript-price pump-subscript-price--tiny ${className}`.trim()}
      title={fullPrice}
    >
      {parts.prefix}0.0
      <sub className="pump-subscript-price__exp">{parts.zeroCount}</sub>
      {parts.mantissa}
      {suffix}
    </span>
  );
}
