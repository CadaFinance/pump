import {
  BONDING_TOKEN_SUPPLY_HUMAN,
  spotPriceBnbFromBondingDecimals,
} from "@/lib/bonding-curve";
import { boardMarkCapBnbString } from "@/lib/board-mark-price";
import type { TokenListItem } from "@/lib/db/launchpad";

export type ArenaTradeWsPayload = {
  type?: string;
  tokenAddress?: string;
  bonding?: {
    reserveZug?: string;
    tokenSold?: string;
    marketCapZug?: string;
    lastPriceZug?: string;
    spotPriceZug?: string;
    progressBps?: number;
    tradeCount?: number;
    holderCount?: number;
    volume24hZug?: string;
    traders24h?: number;
  };
};

const MCAP_JUMP_REJECT_RATIO = 4;

function bondingFieldPresent(value: string | undefined): boolean {
  return value != null && value !== "" && Number.isFinite(Number(value));
}

/** Marginal spot BNB/token from WS bonding fields (human DB decimals). */
export function arenaWsSpotPriceBnb(
  bonding: NonNullable<ArenaTradeWsPayload["bonding"]>
): number {
  if (bondingFieldPresent(bonding.reserveZug) && bondingFieldPresent(bonding.tokenSold)) {
    return spotPriceBnbFromBondingDecimals(bonding.reserveZug, bonding.tokenSold);
  }

  const explicitSpot = Number(bonding.spotPriceZug);
  if (Number.isFinite(explicitSpot) && explicitSpot > 0 && explicitSpot < 1) {
    return explicitSpot;
  }

  const lastSpot = Number(bonding.lastPriceZug);
  if (Number.isFinite(lastSpot) && lastSpot > 0 && lastSpot < 1) {
    return lastSpot;
  }

  return 0;
}

/**
 * Mark cap = spot × 1B supply (price-accuracy contract).
 * Never use WS `marketCapZug` column — it can lag the bonding formula.
 */
export function bondingMarkCapBnbFromWs(
  bonding: NonNullable<ArenaTradeWsPayload["bonding"]>,
  previousMarketCapBnb?: string | number | null
): string | null {
  if (bondingFieldPresent(bonding.reserveZug) && bondingFieldPresent(bonding.tokenSold)) {
    const mcap = boardMarkCapBnbString(bonding.reserveZug, bonding.tokenSold);
    const prev = Number(previousMarketCapBnb);
    if (isMcapJumpSane(prev, Number(mcap))) return mcap;
    if (!Number.isFinite(prev) || prev <= 0) return mcap;
  }

  const spot = arenaWsSpotPriceBnb(bonding);
  if (spot > 0) {
    const mcap = String(spot * BONDING_TOKEN_SUPPLY_HUMAN);
    const prev = Number(previousMarketCapBnb);
    if (isMcapJumpSane(prev, Number(mcap))) return mcap;
    if (!Number.isFinite(prev) || prev <= 0) return mcap;
  }

  return null;
}

function isMcapJumpSane(previous: number, next: number): boolean {
  if (!Number.isFinite(previous) || previous <= 0) return true;
  if (!Number.isFinite(next) || next <= 0) return false;
  const ratio = next / previous;
  return ratio <= MCAP_JUMP_REJECT_RATIO && ratio >= 1 / MCAP_JUMP_REJECT_RATIO;
}

/** Apply indexer WS trade payload to a board row without full refetch. */
export function patchTokenFromArenaTrade(
  token: TokenListItem,
  payload: ArenaTradeWsPayload
): TokenListItem | null {
  const addr = payload.tokenAddress?.toLowerCase();
  if (!addr || token.address.toLowerCase() !== addr) return null;

  const bonding = payload.bonding;
  if (!bonding) return null;

  const nextMcap =
    bondingMarkCapBnbFromWs(bonding, token.marketCapBnb) ?? token.marketCapBnb;

  return {
    ...token,
    progressBps: bonding.progressBps ?? token.progressBps,
    reserveBnb: bonding.reserveZug ?? token.reserveBnb,
    tokenSold: bonding.tokenSold ?? token.tokenSold,
    marketCapBnb: nextMcap,
    tradeCount: bonding.tradeCount ?? token.tradeCount,
    holderCount: bonding.holderCount ?? token.holderCount,
    volume24hBnb: bonding.volume24hZug ?? token.volume24hBnb,
    traders24h: bonding.traders24h ?? token.traders24h,
  };
}

export function patchArenaTokenList(
  tokens: TokenListItem[],
  payload: ArenaTradeWsPayload
): { next: TokenListItem[]; changed: boolean } {
  if (payload.type !== "trade" || !payload.tokenAddress) {
    return { next: tokens, changed: false };
  }

  let changed = false;
  const next = tokens.map((token) => {
    const patched = patchTokenFromArenaTrade(token, payload);
    if (!patched) return token;
    changed = true;
    return patched;
  });

  return { next, changed };
}

export function tradeRoomForToken(tokenAddress: string): string {
  return `token:${tokenAddress.toLowerCase()}`;
}
