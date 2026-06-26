import {
  BONDING_TOKEN_SUPPLY_HUMAN,
  BONDING_VIRTUAL_BNB_HUMAN,
  spotPriceBnbFromBondingDecimals,
} from "@/lib/bonding-curve";
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
    virtualZugReserve?: string;
    virtualTokenReserve?: string;
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

/**
 * Marginal spot from WS — same formula as portfolio SQL (`SQL_BONDING_MARK_PRICE_ZUG`).
 * Uses per-token virtual reserves when indexer sends them.
 */
export function arenaWsSpotPriceBnb(
  bonding: NonNullable<ArenaTradeWsPayload["bonding"]>
): number {
  if (bondingFieldPresent(bonding.reserveZug) && bondingFieldPresent(bonding.tokenSold)) {
    const virtualZug = bondingFieldPresent(bonding.virtualZugReserve)
      ? Number(bonding.virtualZugReserve)
      : BONDING_VIRTUAL_BNB_HUMAN;
    const virtualToken = bondingFieldPresent(bonding.virtualTokenReserve)
      ? Number(bonding.virtualTokenReserve)
      : BONDING_TOKEN_SUPPLY_HUMAN;
    return spotPriceBnbFromBondingDecimals(
      bonding.reserveZug,
      bonding.tokenSold,
      virtualZug,
      virtualToken
    );
  }

  const spotPublished = Number(bonding.spotPriceZug ?? bonding.lastPriceZug);
  if (Number.isFinite(spotPublished) && spotPublished > 0) {
    return spotPublished;
  }

  const mcap = Number(bonding.marketCapZug);
  if (Number.isFinite(mcap) && mcap > 0) {
    return mcap / BONDING_TOKEN_SUPPLY_HUMAN;
  }

  return 0;
}

/** Mark cap = spot × 1B supply — matches portfolio / listTokensByCreator SQL. */
export function bondingMarkCapBnbFromWs(
  bonding: NonNullable<ArenaTradeWsPayload["bonding"]>,
  previousMarketCapBnb?: string | number | null
): string | null {
  const prev = Number(previousMarketCapBnb);

  const spot = arenaWsSpotPriceBnb(bonding);
  if (spot > 0) {
    const mcap = spot * BONDING_TOKEN_SUPPLY_HUMAN;
    if (isMcapJumpSane(prev, mcap)) return String(mcap);
    if (!Number.isFinite(prev) || prev <= 0) return String(mcap);
  }

  const mcapCol = Number(bonding.marketCapZug);
  if (Number.isFinite(mcapCol) && mcapCol > 0 && isMcapJumpSane(prev, mcapCol)) {
    return String(mcapCol);
  }

  return null;
}

function isMcapJumpSane(previous: number, next: number): boolean {
  if (!Number.isFinite(previous) || previous <= 0) return true;
  if (!Number.isFinite(next) || next <= 0) return false;
  const ratio = next / previous;
  return ratio <= MCAP_JUMP_REJECT_RATIO && ratio >= 1 / MCAP_JUMP_REJECT_RATIO;
}

/** Patch tx/holder fields only — MCAP/ATH/vol come from API refetch (same SQL as portfolio). */
export function patchTokenFromArenaTrade(
  token: TokenListItem,
  payload: ArenaTradeWsPayload
): TokenListItem | null {
  const addr = payload.tokenAddress?.toLowerCase();
  if (!addr || token.address.toLowerCase() !== addr) return null;

  const bonding = payload.bonding;
  if (!bonding) return null;

  return {
    ...token,
    progressBps: bonding.progressBps ?? token.progressBps,
    reserveBnb: bonding.reserveZug ?? token.reserveBnb,
    tradeCount: bonding.tradeCount ?? token.tradeCount,
    holderCount: bonding.holderCount ?? token.holderCount,
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
