import { resolveLatestSpotPriceBnb } from "@/lib/candles";
import {
  displayTokenPriceBnb,
  spotPriceBnbFromBondingDecimals,
  spotPriceBnbFromCurveTuple,
} from "@/lib/bonding-curve";
import type { TokenDetail, TradeItem } from "@/lib/db/launchpad";
import type { CurveTuple } from "@/lib/launchpad-events";

/**
 * Single mark price for chart, holders P/L, header, and portfolio DB alignment.
 * Priority: trade-replay spot → bonding reserves → stored last price → on-chain curve.
 */
export function resolveMarkPriceBnb(
  token: Pick<TokenDetail, "lastPriceBnb" | "tradeCount" | "reserveBnb" | "tokenSold">,
  liveTrades: TradeItem[],
  chainCurve?: CurveTuple
): number {
  const fromReplay = resolveLatestSpotPriceBnb(liveTrades);
  if (fromReplay != null && fromReplay > 0) return fromReplay;

  const fromBonding = spotPriceBnbFromBondingDecimals(token.reserveBnb, token.tokenSold);
  if (fromBonding > 0) return fromBonding;

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
