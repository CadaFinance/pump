/** Feature flags for phased DB performance rollout (default off = legacy behavior). */

export function useBondingStateCounts(): boolean {
  return process.env.USE_BONDING_STATE_COUNTS === "true";
}

export function useMvTokenStats(): boolean {
  return process.env.USE_MV_TOKEN_STATS === "true";
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
