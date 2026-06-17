/** Avg-cost position accounting — mirrors src/lib/portfolio-lots.ts */

export type PositionCostState = {
  tokenBalance: number;
  totalBought: number;
  totalSold: number;
  remainingCostBasis: number;
  realizedPnl: number;
};

export function emptyPositionCostState(): PositionCostState {
  return {
    tokenBalance: 0,
    totalBought: 0,
    totalSold: 0,
    remainingCostBasis: 0,
    realizedPnl: 0,
  };
}

export function tradeNetZug(grossZug: number, feeZug: number): number {
  return Math.max(0, grossZug - feeZug);
}

/**
 * Apply one bonding-curve trade to position aggregates (avg-cost, resets at zero balance).
 */
export function applyTradeToPositionCost(
  state: PositionCostState,
  isBuy: boolean,
  grossZug: number,
  feeZug: number,
  tokenAmount: number
): PositionCostState {
  const netZug = tradeNetZug(grossZug, feeZug);
  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0 || netZug <= 0) {
    return state;
  }

  if (isBuy) {
    return {
      tokenBalance: state.tokenBalance + tokenAmount,
      totalBought: state.totalBought + grossZug,
      totalSold: state.totalSold,
      remainingCostBasis: state.remainingCostBasis + netZug,
      realizedPnl: state.realizedPnl,
    };
  }

  const tracked = Math.max(state.tokenBalance, 0);
  const sold = Math.min(tokenAmount, tracked);
  if (sold <= 0) {
    return {
      ...state,
      tokenBalance: Math.max(0, state.tokenBalance - tokenAmount),
      totalSold: state.totalSold + grossZug,
    };
  }

  const avgCost = tracked > 0 ? state.remainingCostBasis / tracked : 0;
  const costRemoved = avgCost * sold;
  const proceeds = netZug * (sold / tokenAmount);
  const newBalance = Math.max(0, tracked - sold);

  return {
    tokenBalance: newBalance,
    totalBought: state.totalBought,
    totalSold: state.totalSold + grossZug,
    remainingCostBasis: newBalance <= 0 ? 0 : Math.max(0, state.remainingCostBasis - costRemoved),
    realizedPnl: state.realizedPnl + (proceeds - costRemoved),
  };
}
