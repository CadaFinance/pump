export const FEE_BPS_DENOMINATOR = 10_000;

/** Max protocol fee on BondingCurveManager (10%). */
export const MAX_PROTOCOL_FEE_BPS = 1_000;

/** Max creator share of the protocol fee (50%). */
export const MAX_CREATOR_FEE_SHARE_BPS = 5_000;

export function protocolFeeBpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToProtocolFeeBps(percent: number): number {
  return Math.round(percent * 100);
}

export function creatorShareBpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToCreatorShareBps(percent: number): number {
  return Math.round(percent * 100);
}

export function referrerShareBpsToPercent(bps: number): number {
  return bps / 100;
}

export function percentToReferrerShareBps(percent: number): number {
  return Math.round(percent * 100);
}

/** Treasury share when only creator split is configured (legacy helper). */
export function treasuryShareBps(creatorShareBps: number): number {
  return FEE_BPS_DENOMINATOR - creatorShareBps;
}

export function treasurySharePercent(creatorShareBps: number): number {
  return treasuryShareBps(creatorShareBps) / 100;
}

/** Treasury remainder after creator + referrer shares of the protocol fee. */
export function treasuryShareBpsFromSplit(creatorShareBps: number, referrerShareBps: number): number {
  return FEE_BPS_DENOMINATOR - creatorShareBps - referrerShareBps;
}

export function treasurySharePercentFromSplit(creatorShareBps: number, referrerShareBps: number): number {
  return treasuryShareBpsFromSplit(creatorShareBps, referrerShareBps) / 100;
}

export function effectiveTradeFeePercent(protocolFeeBps: number, shareBps: number): number {
  return (protocolFeeBps / FEE_BPS_DENOMINATOR) * (shareBps / FEE_BPS_DENOMINATOR) * 100;
}
