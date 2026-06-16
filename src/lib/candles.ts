import { parseEther } from "viem";
import type { TradeItem } from "@/lib/db/launchpad";
import {
  DEFAULT_VIRTUAL_TOKEN_RESERVE,
  DEFAULT_VIRTUAL_ZUG_RESERVE,
  spotPriceZugFromReserves,
} from "@/lib/bonding-curve";

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

export type TradeSpotTick = {
  id: string;
  before: number;
  after: number;
};

/**
 * Replay bonding-curve reserve state to derive spot price ticks.
 * Charts use spot (not per-trade average execution price) — avoids giant wicks on large buys/sells.
 */
export function buildTradeSpotTicks(
  trades: TradeItem[],
  virtualZugReserve = DEFAULT_VIRTUAL_ZUG_RESERVE,
  virtualTokenReserve = DEFAULT_VIRTUAL_TOKEN_RESERVE
): Map<string, TradeSpotTick> {
  const ticks = new Map<string, TradeSpotTick>();
  let reserve = 0n;
  let sold = 0n;

  for (const trade of trades) {
    const before = spotPriceZugFromReserves(
      reserve,
      sold,
      virtualZugReserve,
      virtualTokenReserve
    );

    const zug = parseEther(trade.nativeAmount as `${number}`);
    const fee = parseEther((trade.feeBnb ?? "0") as `${number}`);
    const tokens = parseEther(trade.tokenAmount as `${number}`);

    if (trade.side === "BUY") {
      reserve += zug - fee;
      sold += tokens;
    } else {
      reserve -= zug;
      sold -= tokens;
    }

    const after = spotPriceZugFromReserves(
      reserve,
      sold,
      virtualZugReserve,
      virtualTokenReserve
    );
    ticks.set(trade.id, { id: trade.id, before, after });
  }

  return ticks;
}

function tradeVolumeBnb(trade: TradeItem): number {
  if (trade.netBnb != null) return Math.max(0, Number(trade.netBnb));
  const gross = Number(trade.nativeAmount);
  const fee = Number(trade.feeBnb ?? 0);
  return Math.max(0, gross - fee);
}

export function tradeToChartPoint(
  trade: TradeItem,
  spot?: TradeSpotTick
): ChartTradePoint | null {
  const blockTimeMs = new Date(trade.blockTime).getTime();
  const price = spot?.after ?? Number(trade.priceBnb);
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
  /** Use bonding-curve spot price instead of per-trade average execution price. */
  useSpotPrice?: boolean;
  /** Max flat candles after the last trade when filling gaps (avoids long dead tails). */
  maxGapBarsAfterLastTrade?: number;
};

const MAX_CANDLES = 4000;

function gapTailBarsForInterval(interval: CandleInterval): number {
  switch (interval) {
    case "15s":
      return 8;
    case "1m":
      return 6;
    case "5m":
      return 4;
    default:
      return 2;
  }
}

export function buildCandlesFromTrades(
  trades: TradeItem[],
  interval: CandleInterval,
  priceScale = 1,
  options: BuildCandlesOptions = {}
): { candles: CandleBar[]; volumes: VolumeBar[] } {
  const intervalMs = CANDLE_INTERVALS.find((i) => i.id === interval)?.ms ?? 5 * 60_000;
  const intervalSec = intervalMs / 1000;
  const fillGaps = options.fillGaps !== false;
  const useSpotPrice = options.useSpotPrice !== false;
  const endTimeMs = options.endTimeMs ?? Date.now();
  const spotTicks = useSpotPrice ? buildTradeSpotTicks(trades) : null;

  if (trades.length === 0) {
    return { candles: [], volumes: [] };
  }

  let priorClose: number | null = null;

  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number; volume: number; buyVol: number }
  >();

  for (const trade of trades) {
    const spot = spotTicks?.get(trade.id);
    const point = tradeToChartPoint(trade, spot);
    if (!point) continue;
    const bucketTime = Math.floor(point.blockTimeMs / intervalMs) * intervalMs;
    const bucketSec = Math.floor(bucketTime / 1000);
    const closePrice = (spot?.after ?? point.priceBnb) * priceScale;
    const touchPrices = spot
      ? [spot.before * priceScale, spot.after * priceScale]
      : [closePrice];

    const existing = buckets.get(bucketSec);
    if (!existing) {
      const open = (priorClose ?? touchPrices[0] ?? closePrice) as number;
      buckets.set(bucketSec, {
        open,
        high: Math.max(open, ...touchPrices),
        low: Math.min(open, ...touchPrices),
        close: closePrice,
        volume: point.volumeBnb,
        buyVol: point.isBuy ? point.volumeBnb : 0,
      });
    } else {
      existing.high = Math.max(existing.high, ...touchPrices);
      existing.low = Math.min(existing.low, ...touchPrices);
      existing.close = closePrice;
      existing.volume += point.volumeBnb;
      if (point.isBuy) existing.buyVol += point.volumeBnb;
    }
    priorClose = buckets.get(bucketSec)!.close;
  }

  if (buckets.size === 0) {
    return { candles: [], volumes: [] };
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
  const gapTail =
    options.maxGapBarsAfterLastTrade ?? gapTailBarsForInterval(interval);
  const tailEndSec = lastTradeSec + gapTail * intervalSec;
  const liveEndSec = Math.floor(endBucketMs / 1000);
  const endSec = Math.max(lastTradeSec, Math.min(liveEndSec, tailEndSec));

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
