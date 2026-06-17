import { resolveLatestSpotPriceBnb } from "@/lib/candles";
import {
  displayTokenPriceBnb,
  spotPriceBnbFromCurveTuple,
} from "@/lib/bonding-curve";
import type { TokenDetail, TradeItem } from "@/lib/db/launchpad";
import type { CurveTuple } from "@/lib/launchpad-events";

/**
 * Single mark price for chart, holders P/L, header, and portfolio DB alignment.
 * Priority: trade-replay spot (chart) → indexer DB → on-chain curve fallback.
 */
export function resolveMarkPriceBnb(
  token: Pick<TokenDetail, "lastPriceBnb" | "tradeCount">,
  liveTrades: TradeItem[],
  chainCurve?: CurveTuple
): number {
  const fromReplay = resolveLatestSpotPriceBnb(liveTrades);
  if (fromReplay != null && fromReplay > 0) return fromReplay;

  const fromDb = Number(token.lastPriceBnb);
  if (fromDb > 0) return fromDb;

  if (chainCurve) {
    const fromChain = spotPriceBnbFromCurveTuple(
      chainCurve[2],
      chainCurve[3],
      chainCurve[5],
      chainCurve[6]
    );
    if (fromChain > 0) return fromChain;
  }

  return displayTokenPriceBnb(token.lastPriceBnb, token.tradeCount);
}
