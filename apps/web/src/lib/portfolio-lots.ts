import { tradeNetBnbFromParts } from "@/lib/format-usd";

export type TradeLotInput = {
  traderAddress: string;
  side: string;
  tokenAmount: string;
  nativeAmount: string;
  feeBnb?: string | null;
  netBnb?: string | null;
  blockTime: string;
  nativeUsdRate?: string | null;
};

/** Open-lot cost basis + cumulative realized PnL from trade tape (avg-cost, resets at zero balance). */
export type WalletTokenLot = {
  netTokens: number;
  remainingCostBnb: number;
  realizedPnlBnb: number;
  remainingCostUsd: number;
  realizedPnlUsd: number;
};

function tradeNetBnb(trade: TradeLotInput): number {
  return tradeNetBnbFromParts(trade.nativeAmount, trade.feeBnb, trade.netBnb);
}

function tradeNativeUsdRate(trade: TradeLotInput): number | null {
  const raw = trade.nativeUsdRate;
  if (raw == null || raw === "") return null;
  const rate = Number(raw);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Replay wallet trades chronologically:
 * - Buys add to cost basis at net BNB (+ USD when nativeUsdRate present)
 * - Sells remove avg-cost slice and book realized PnL
 * - When balance hits 0, cost basis resets for the next round
 */
export function computeWalletTokenLot(
  trades: TradeLotInput[],
  walletAddress: string
): WalletTokenLot {
  const target = walletAddress.toLowerCase();
  const ordered = [...trades].sort(
    (a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
  );

  let netTokens = 0;
  let remainingCostBnb = 0;
  let realizedPnlBnb = 0;
  let remainingCostUsd = 0;
  let realizedPnlUsd = 0;

  for (const trade of ordered) {
    if (trade.traderAddress.toLowerCase() !== target) continue;

    const tokenAmount = Number(trade.tokenAmount);
    const bnbAmount = tradeNetBnb(trade);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0 || bnbAmount <= 0) continue;

    const rate = tradeNativeUsdRate(trade);

    if (trade.side === "BUY") {
      netTokens += tokenAmount;
      remainingCostBnb += bnbAmount;
      if (rate != null) remainingCostUsd += bnbAmount * rate;
      continue;
    }

    const tracked = Math.max(netTokens, 0);
    const sold = Math.min(tokenAmount, tracked);
    if (sold <= 0) continue;

    const avgCost = tracked > 0 ? remainingCostBnb / tracked : 0;
    const costRemoved = avgCost * sold;
    const proceeds = bnbAmount * (sold / tokenAmount);

    const avgCostUsd = tracked > 0 ? remainingCostUsd / tracked : 0;
    const costRemovedUsd = avgCostUsd * sold;
    const proceedsUsd = rate != null ? proceeds * rate : 0;

    realizedPnlBnb += proceeds - costRemoved;
    realizedPnlUsd += proceedsUsd - costRemovedUsd;
    netTokens = Math.max(0, tracked - sold);
    remainingCostBnb = Math.max(0, remainingCostBnb - costRemoved);
    remainingCostUsd = Math.max(0, remainingCostUsd - costRemovedUsd);
  }

  return {
    netTokens,
    remainingCostBnb,
    realizedPnlBnb,
    remainingCostUsd,
    realizedPnlUsd,
  };
}
