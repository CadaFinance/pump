/** Feature flags for phased DB performance rollout. */

function perfFlagEnabled(name: string): boolean {
  const value = process.env[name];
  if (value === "false") return false;
  if (value === "true") return true;
  return process.env.NODE_ENV === "production";
}

/** Pre-aggregated bonding_states counts (indexed columns). */
export function useBondingStateCounts(): boolean {
  return perfFlagEnabled("USE_BONDING_STATE_COUNTS");
}

/** Materialized views for trade stats + price anchors (indexer refresh). */
export function useMvTokenStats(): boolean {
  return perfFlagEnabled("USE_MV_TOKEN_STATS");
}

export function useWebSocketLive(): boolean {
  return process.env.NEXT_PUBLIC_WS_ENABLED === "true";
}

export function webSocketUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_WS_URL?.trim();
  return url || null;
}

export function walletRoom(address: string): string {
  return `wallet:${address.toLowerCase()}`;
}
