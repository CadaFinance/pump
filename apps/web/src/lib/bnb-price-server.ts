const CACHE_MS = 30_000;

type CachedPrice = {
  bnbUsd: number;
  fetchedAt: number;
};

let cache: CachedPrice | null = null;

/** Live BNB/USD from Binance BNBUSDT ticker. */
export async function fetchBnbUsdPrice(): Promise<{
  bnbUsd: number | null;
  quote: "USDT";
  source: "cache" | "binance" | "unavailable";
}> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return { bnbUsd: cache.bnbUsd, quote: "USDT", source: "cache" };
  }

  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT", {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { bnbUsd: null, quote: "USDT", source: "unavailable" };
    }

    const body = (await res.json()) as { price?: string };
    const bnbUsd = Number(body.price);
    if (!Number.isFinite(bnbUsd) || bnbUsd <= 0) {
      return { bnbUsd: null, quote: "USDT", source: "unavailable" };
    }

    cache = { bnbUsd, fetchedAt: Date.now() };
    return { bnbUsd, quote: "USDT", source: "binance" };
  } catch {
    return { bnbUsd: null, quote: "USDT", source: "unavailable" };
  }
}
