import {
  BONDING_TOKEN_SUPPLY_HUMAN,
  BONDING_VIRTUAL_BNB_HUMAN,
  spotPriceBnbFromBondingDecimals,
} from "@/lib/bonding-curve";

/** FDV from marginal spot × 1B supply (price-accuracy contract). */
export function boardMarkCapBnbFromBonding(
  reserveBnb: string | number | null | undefined,
  tokenSold: string | number | null | undefined
): number {
  const spot = spotPriceBnbFromBondingDecimals(reserveBnb, tokenSold);
  if (spot <= 0) return 0;
  return spot * BONDING_TOKEN_SUPPLY_HUMAN;
}

export function boardMarkCapBnbString(
  reserveBnb: string | number | null | undefined,
  tokenSold: string | number | null | undefined
): string {
  const mcap = boardMarkCapBnbFromBonding(reserveBnb, tokenSold);
  return mcap > 0 ? String(mcap) : "0";
}

/**
 * Launch curve starts at virtual reserve (~5 BNB FDV). If trades exist but mcap still
 * matches launch default while reserves moved, the row is stale (cached pre-trade snapshot).
 */
export function isBoardRowMarkStale(params: {
  marketCapBnb: string | number | null | undefined;
  reserveBnb: string | number | null | undefined;
  tradeCount?: number | null;
}): boolean {
  const trades = params.tradeCount ?? 0;
  if (trades <= 0) return false;

  const reserve = Number(params.reserveBnb ?? 0);
  if (!Number.isFinite(reserve) || reserve <= 0) return false;

  const mcap = Number(params.marketCapBnb ?? 0);
  if (!Number.isFinite(mcap) || mcap <= 0) return true;

  const launchMcap = BONDING_VIRTUAL_BNB_HUMAN;
  const atLaunchDefault = mcap <= launchMcap * 1.02;
  return atLaunchDefault;
}
