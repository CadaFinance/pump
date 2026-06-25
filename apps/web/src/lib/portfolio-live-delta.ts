import { wsBondingSpotPriceBnb } from "@/lib/token-live-delta";

export type WalletTradeWsPayload = {
  type?: string;
  walletAddress?: string;
  tokenAddress?: string;
  trade?: {
    side: string;
    zugAmount: string;
    tokenAmount: string;
    blockTime?: string;
  };
  position?: {
    tokenBalance: string;
    remainingCostBasisZug: string;
    realizedPnlZug: string;
    remainingCostBasisUsd?: string;
    realizedPnlUsd?: string;
  };
  bonding?: {
    lastPriceZug?: string;
    marketCapZug?: string;
    reserveZug?: string;
    tokenSold?: string;
  };
};

const MARK_PRICE_JUMP_REJECT_RATIO = 4;

function isMarkPriceJumpSane(previous: number, next: number): boolean {
  if (!Number.isFinite(previous) || previous <= 0) return true;
  if (!Number.isFinite(next) || next <= 0) return false;
  const ratio = next / previous;
  return ratio <= MARK_PRICE_JUMP_REJECT_RATIO && ratio >= 1 / MARK_PRICE_JUMP_REJECT_RATIO;
}

function estimateNetVolumeBnb(trade: NonNullable<WalletTradeWsPayload["trade"]>): number {
  const gross = Number(trade.zugAmount);
  return Number.isFinite(gross) && gross > 0 ? gross : 0;
}

function patchPositionRow<T extends {
  tokenBalance: string;
  remainingCostBasisBnb: string;
  realizedPnlBnb: string;
  remainingCostBasisUsd?: string;
  realizedPnlUsd?: string;
  lastPriceBnb: string;
  estimatedValueBnb: number;
}>(
  position: T,
  payload: WalletTradeWsPayload
): T {
  const pos = payload.position;
  if (!pos) return position;

  const spot = wsBondingSpotPriceBnb(payload.bonding);
  const prevPrice = Number(position.lastPriceBnb);
  const lastPriceBnb =
    spot > 0 && isMarkPriceJumpSane(prevPrice, spot)
      ? String(spot)
      : spot > 0 && !(prevPrice > 0)
        ? String(spot)
        : position.lastPriceBnb;
  const balance = Number(pos.tokenBalance);
  const estimatedValueBnb =
    Number.isFinite(balance) && balance > 0 && Number(lastPriceBnb) > 0
      ? balance * Number(lastPriceBnb)
      : 0;

  return {
    ...position,
    tokenBalance: pos.tokenBalance,
    remainingCostBasisBnb: pos.remainingCostBasisZug,
    realizedPnlBnb: pos.realizedPnlZug,
    remainingCostBasisUsd: pos.remainingCostBasisUsd ?? position.remainingCostBasisUsd,
    realizedPnlUsd: pos.realizedPnlUsd ?? position.realizedPnlUsd,
    lastPriceBnb,
    estimatedValueBnb,
  };
}

export type PortfolioLivePatchTarget = {
  address: string;
  totalVolumeBnb: number;
  buyVolumeBnb: number;
  sellVolumeBnb: number;
  lastTradeAt: string | null;
  positions: Array<{
    tokenAddress: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
    tokenBalance: string;
    remainingCostBasisBnb: string;
    realizedPnlBnb: string;
    remainingCostBasisUsd?: string;
    realizedPnlUsd?: string;
    lastPriceBnb: string;
    estimatedValueBnb: number;
  }>;
};

export function patchPortfolioFromWalletTrade<T extends PortfolioLivePatchTarget>(
  portfolio: T,
  payload: WalletTradeWsPayload,
  walletAddress: string
): { next: T; changed: boolean; needsFullReload: boolean } {
  const wallet = walletAddress.toLowerCase();
  if (payload.type !== "wallet_trade" || payload.walletAddress?.toLowerCase() !== wallet) {
    return { next: portfolio, changed: false, needsFullReload: false };
  }

  const token = payload.tokenAddress?.toLowerCase();
  if (!token || !payload.position) {
    return { next: portfolio, changed: false, needsFullReload: false };
  }

  const index = portfolio.positions.findIndex(
    (p) => p.tokenAddress.toLowerCase() === token
  );

  if (index < 0) {
    const isBuy = payload.trade?.side?.toUpperCase() === "BUY";
    return { next: portfolio, changed: false, needsFullReload: isBuy };
  }

  const trade = payload.trade;
  let totalVolumeBnb = portfolio.totalVolumeBnb;
  let buyVolumeBnb = portfolio.buyVolumeBnb;
  let sellVolumeBnb = portfolio.sellVolumeBnb;
  let lastTradeAt = portfolio.lastTradeAt;

  if (trade) {
    const vol = estimateNetVolumeBnb(trade);
    if (vol > 0) {
      totalVolumeBnb += vol;
      if (trade.side?.toUpperCase() === "BUY") buyVolumeBnb += vol;
      else sellVolumeBnb += vol;
    }
    if (trade.blockTime) {
      lastTradeAt = trade.blockTime;
    }
  }

  const positions = portfolio.positions.map((p, i) =>
    i === index ? patchPositionRow(p, payload) : p
  );

  return {
    next: {
      ...portfolio,
      positions,
      totalVolumeBnb,
      buyVolumeBnb,
      sellVolumeBnb,
      lastTradeAt,
    },
    changed: true,
    needsFullReload: false,
  };
}

export type WalletHoldingPatch = {
  tokenAddress: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
  tokenBalance: string;
  lastPriceBnb: string;
  estimatedValueBnb: number;
};

export function patchWalletHoldingFromWalletTrade(
  holdings: WalletHoldingPatch[],
  payload: WalletTradeWsPayload,
  meta: { symbol: string; name: string; logoUrl: string | null }
): WalletHoldingPatch[] {
  const token = payload.tokenAddress?.toLowerCase();
  if (!token || !payload.position) return holdings;

  const spot = wsBondingSpotPriceBnb(payload.bonding);
  const lastPriceBnb =
    spot > 0 ? String(spot) : payload.bonding?.lastPriceZug ?? "0";
  const balance = Number(payload.position.tokenBalance);
  const estimatedValueBnb =
    Number.isFinite(balance) && balance > 0 && Number(lastPriceBnb) > 0
      ? balance * Number(lastPriceBnb)
      : 0;

  const index = holdings.findIndex((h) => h.tokenAddress.toLowerCase() === token);
  const row: WalletHoldingPatch = {
    tokenAddress: token,
    symbol: meta.symbol,
    name: meta.name,
    logoUrl: meta.logoUrl,
    tokenBalance: payload.position.tokenBalance,
    lastPriceBnb,
    estimatedValueBnb,
  };

  if (index < 0) {
    if (balance <= 0) return holdings;
    return [...holdings, row];
  }

  if (balance <= 0) {
    return holdings.filter((_, i) => i !== index);
  }

  const next = holdings.slice();
  next[index] = { ...next[index]!, ...row };
  return next;
}
