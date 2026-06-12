import type { TradeItem } from "@/lib/db/launchpad";
import { DEFAULT_STARTING_SPOT_PRICE_BNB } from "@/lib/bonding-curve";

export type CandleInterval = "15s" | "1m" | "5m" | "15m" | "1h" | "4h";

export const CANDLE_INTERVALS: { id: CandleInterval; label: string; ms: number }[] = [
  { id: "15s", label: "15s", ms: 15_000 },
  { id: "1m", label: "1m", ms: 60_000 },
  { id: "5m", label: "5m", ms: 5 * 60_000 },
  { id: "15m", label: "15m", ms: 15 * 60_000 },
  { id: "1h", label: "1h", ms: 60 * 60_000 },
  { id: "4h", label: "4h", ms: 4 * 60 * 60_000 },
];

export type CandleBar = {
  /** Unix seconds (UTC) — lightweight-charts UTCTimestamp */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type VolumeBar = {
  time: number;
  value: number;
  color: string;
};

export type ChartTradePoint = {
  priceBnb: number;
  blockTimeMs: number;
  volumeBnb: number;
  isBuy: boolean;
};

function tradeVolumeBnb(trade: TradeItem): number {
  if (trade.netBnb != null) return Math.max(0, Number(trade.netBnb));
  const gross = Number(trade.nativeAmount);
  const fee = Number(trade.feeBnb ?? 0);
  return Math.max(0, gross - fee);
}

export function tradeToChartPoint(trade: TradeItem): ChartTradePoint | null {
  const price = Number(trade.priceBnb);
  const blockTimeMs = new Date(trade.blockTime).getTime();
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(blockTimeMs)) {
    return null;
  }
  return {
    priceBnb: price,
    blockTimeMs,
    volumeBnb: tradeVolumeBnb(trade),
    isBuy: trade.side === "BUY",
  };
}

/** Dedupe by tx+log index id; sort ascending by time. */
export function mergeTradesForChart(dbTrades: TradeItem[], optimistic: TradeItem[]): TradeItem[] {
  const byId = new Map<string, TradeItem>();
  for (const trade of dbTrades) {
    byId.set(trade.id, trade);
  }
  for (const trade of optimistic) {
    if (!byId.has(trade.id)) {
      byId.set(trade.id, trade);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
  );
}

export type BuildCandlesOptions = {
  /** Fill empty intervals with flat candles at last close (pump.fun style). */
  fillGaps?: boolean;
  /** Last bucket time (ms). Defaults to now for live charts. */
  endTimeMs?: number;
};

const MAX_CANDLES = 4000;

export function buildCandlesFromTrades(
  trades: TradeItem[],
  interval: CandleInterval,
  priceScale = 1,
  options: BuildCandlesOptions = {}
): { candles: CandleBar[]; volumes: VolumeBar[] } {
  const intervalMs = CANDLE_INTERVALS.find((i) => i.id === interval)?.ms ?? 5 * 60_000;
  const intervalSec = intervalMs / 1000;
  const fillGaps = options.fillGaps !== false;
  const endTimeMs = options.endTimeMs ?? Date.now();
  const points = trades
    .map(tradeToChartPoint)
    .filter((p): p is ChartTradePoint => p != null);

  if (points.length === 0) {
    return { candles: [], volumes: [] };
  }

  const genesisOpen = DEFAULT_STARTING_SPOT_PRICE_BNB * priceScale;
  let priorClose: number | null = null;

  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number; volume: number; buyVol: number }
  >();

  for (const point of points) {
    const bucketTime = Math.floor(point.blockTimeMs / intervalMs) * intervalMs;
    const bucketSec = Math.floor(bucketTime / 1000);
    const price = point.priceBnb * priceScale;

    const existing = buckets.get(bucketSec);
    if (!existing) {
      const open = priorClose ?? genesisOpen;
      buckets.set(bucketSec, {
        open,
        high: Math.max(open, price),
        low: Math.min(open, price),
        close: price,
        volume: point.volumeBnb,
        buyVol: point.isBuy ? point.volumeBnb : 0,
      });
    } else {
      existing.high = Math.max(existing.high, price);
      existing.low = Math.min(existing.low, price);
      existing.close = price;
      existing.volume += point.volumeBnb;
      if (point.isBuy) existing.buyVol += point.volumeBnb;
    }
    priorClose = buckets.get(bucketSec)!.close;
  }

  const sortedTimes = [...buckets.keys()].sort((a, b) => a - b);

  if (!fillGaps || sortedTimes.length === 0) {
    const candles: CandleBar[] = [];
    const volumes: VolumeBar[] = [];
    for (const time of sortedTimes) {
      const b = buckets.get(time)!;
      candles.push({
        time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      });
      const buyHeavy = b.buyVol >= b.volume / 2;
      volumes.push({
        time,
        value: b.volume,
        color: buyHeavy ? "rgba(74, 222, 128, 0.5)" : "rgba(248, 113, 113, 0.5)",
      });
    }
    return { candles, volumes };
  }

  let startSec = sortedTimes[0]!;
  const lastTradeSec = sortedTimes[sortedTimes.length - 1]!;
  const endBucketMs = Math.floor(endTimeMs / intervalMs) * intervalMs;
  const endSec = Math.max(Math.floor(endBucketMs / 1000), lastTradeSec);

  const span = Math.floor((endSec - startSec) / intervalSec) + 1;
  if (span > MAX_CANDLES) {
    // Keep the most recent window — older 15s intervals were dropping new trades.
    startSec = endSec - (MAX_CANDLES - 1) * intervalSec;
  }

  const candles: CandleBar[] = [];
  const volumes: VolumeBar[] = [];
  let lastClose: number | null = null;
  for (const t of sortedTimes) {
    if (t < startSec) {
      lastClose = buckets.get(t)!.close;
    }
  }

  for (let t = startSec; t <= endSec; t += intervalSec) {
    const b = buckets.get(t);
    if (b) {
      candles.push({
        time: t,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      });
      const buyHeavy = b.buyVol >= b.volume / 2;
      volumes.push({
        time: t,
        value: b.volume,
        color: buyHeavy ? "rgba(74, 222, 128, 0.5)" : "rgba(248, 113, 113, 0.5)",
      });
      lastClose = b.close;
    } else if (lastClose != null) {
      candles.push({
        time: t,
        open: lastClose,
        high: lastClose,
        low: lastClose,
        close: lastClose,
      });
      volumes.push({
        time: t,
        value: 0,
        color: "rgba(128, 128, 128, 0.15)",
      });
    }
  }

  return { candles, volumes };
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

/** Pump.fun-style subscript for tiny prices: $0.0₄42 = $0.000042 */
export function formatPumpSubscriptPrice(value: number, prefix = "$"): string {
  if (!Number.isFinite(value) || value <= 0) return `${prefix}0`;
  if (value >= 1) return `${prefix}${value.toFixed(2)}`;
  if (value >= 0.01) return `${prefix}${value.toFixed(4)}`;
  if (value >= 0.0001) return `${prefix}${value.toFixed(6)}`;

  const scientific = value.toExponential(12);
  const match = /^(\d)\.(\d+)e-(\d+)$/.exec(scientific);
  if (!match) return `${prefix}${value.toExponential(2)}`;

  const mantissa = (match[1] + match[2]).replace(/0+$/, "").slice(0, 4);
  const exp = Number(match[3]);
  const zeroCount = Math.max(0, exp - 1);
  const sub =
    zeroCount <= 9
      ? SUBSCRIPTS[zeroCount]!
      : String(zeroCount)
          .split("")
          .map((d) => SUBSCRIPTS[Number(d)]!)
          .join("");

  return `${prefix}0.0${sub}${mantissa}`;
}

export function formatChartPrice(value: number, currency: "bnb" | "usd" | "mcap"): string {
  if (currency === "usd" || currency === "mcap") {
    return formatPumpSubscriptPrice(value, "$");
  }
  if (value >= 0.001) return `${value.toFixed(6)} BNB`;
  return formatPumpSubscriptPrice(value, "").replace(/^\$/, "") + " BNB";
}

export function resolveChartPriceFormat(
  candles: CandleBar[],
  currency: "bnb" | "usd" | "mcap"
): {
  type: "custom";
  formatter: (price: number) => string;
  minMove: number;
} {
  let max = 0;
  for (const c of candles) {
    max = Math.max(max, c.high, c.close);
  }

  let precision = 8;
  if (max > 0) {
    const exp = Math.floor(Math.log10(max));
    precision = Math.max(4, Math.min(12, -exp + 2));
  }

  const minMove = Math.pow(10, -precision);
  const prefix = currency === "usd" || currency === "mcap" ? "$" : "";

  return {
    type: "custom",
    minMove,
    formatter: (price: number) => {
      if (!Number.isFinite(price)) return "—";
      if (price === 0) return `${prefix}0`;
      if (currency === "usd" || currency === "mcap") return formatPumpSubscriptPrice(price, "$");
      if (price >= 0.001) return price.toFixed(Math.min(6, precision));
      return formatPumpSubscriptPrice(price, "") + " BNB";
    },
  };
}
