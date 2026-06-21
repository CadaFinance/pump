import { tradeNetBnbFromParts } from "@/lib/format-usd";

export type TradeLotInput = {
  traderAddress: string;
  side: string;
  tokenAmount: string;
  nativeAmount: string;
  feeBnb?: string | null;
  netBnb?: string | null;
  blockTime: string;
};

/** Open-lot cost basis + cumulative realized PnL from trade tape (avg-cost, resets at zero balance). */
export type WalletTokenLot = {
  netTokens: number;
  remainingCostBnb: number;
  realizedPnlBnb: number;
};

function tradeNetBnb(trade: TradeLotInput): number {
  return tradeNetBnbFromParts(trade.nativeAmount, trade.feeBnb, trade.netBnb);
}

/**
 * Replay wallet trades chronologically:
 * - Buys add to cost basis at net BNB
 * - Sells remove avg-cost slice and book realized PnL (proceeds − cost removed)
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

  for (const trade of ordered) {
    if (trade.traderAddress.toLowerCase() !== target) continue;

    const tokenAmount = Number(trade.tokenAmount);
    const bnbAmount = tradeNetBnb(trade);
    if (!Number.isFinite(tokenAmount) || tokenAmount <= 0 || bnbAmount <= 0) continue;

    if (trade.side === "BUY") {
      netTokens += tokenAmount;
      remainingCostBnb += bnbAmount;
      continue;
    }

    const tracked = Math.max(netTokens, 0);
    const sold = Math.min(tokenAmount, tracked);
    if (sold <= 0) continue;

    const avgCost = tracked > 0 ? remainingCostBnb / tracked : 0;
    const costRemoved = avgCost * sold;
    const proceeds = bnbAmount * (sold / tokenAmount);

    realizedPnlBnb += proceeds - costRemoved;
    netTokens = Math.max(0, tracked - sold);
    remainingCostBnb = Math.max(0, remainingCostBnb - costRemoved);
  }

  return { netTokens, remainingCostBnb, realizedPnlBnb };
}
