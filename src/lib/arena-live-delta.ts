import {
  BONDING_TOKEN_SUPPLY_HUMAN,
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
    progressBps?: number;
    tradeCount?: number;
    holderCount?: number;
  };
};

const MCAP_JUMP_REJECT_RATIO = 4;

/**
 * Same mark-cap as API SQL (`spot × 1B supply`), not raw `bonding_states.market_cap_zug`
 * which can be stale when `last_price_zug` was execution price.
 */
export function bondingMarkCapBnbFromWs(
  bonding: NonNullable<ArenaTradeWsPayload["bonding"]>
): string | null {
  const spot = spotPriceBnbFromBondingDecimals(bonding.reserveZug, bonding.tokenSold);
  if (spot > 0) {
    return String(spot * BONDING_TOKEN_SUPPLY_HUMAN);
  }

  const lastSpot = Number(bonding.lastPriceZug);
  if (Number.isFinite(lastSpot) && lastSpot > 0 && lastSpot < 1) {
    return String(lastSpot * BONDING_TOKEN_SUPPLY_HUMAN);
  }

  return bonding.marketCapZug ?? null;
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

  const nextMcap = bondingMarkCapBnbFromWs(bonding);
  const prevMcap = Number(token.marketCapBnb);
  const resolvedMcap =
    nextMcap != null && isMcapJumpSane(prevMcap, Number(nextMcap))
      ? nextMcap
      : token.marketCapBnb;

  return {
    ...token,
    progressBps: bonding.progressBps ?? token.progressBps,
    reserveBnb: bonding.reserveZug ?? token.reserveBnb,
    marketCapBnb: resolvedMcap,
    tradeCount: bonding.tradeCount ?? token.tradeCount,
    holderCount: bonding.holderCount ?? token.holderCount,
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
