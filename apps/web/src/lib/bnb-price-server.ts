import { fetchNativeUsdPrice } from "@/lib/native-usd-price";

/** Live native/USD (ETH on Base) — legacy name kept for imports. */
export async function fetchBnbUsdPrice(): Promise<{
  bnbUsd: number | null;
  quote: "USDT";
  source: "cache" | "binance" | "unavailable";
}> {
  const { nativeUsd, quote, source } = await fetchNativeUsdPrice();
  return { bnbUsd: nativeUsd, quote, source };
}
