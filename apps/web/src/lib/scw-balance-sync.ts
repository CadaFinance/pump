/** Cross-component SCW native balance refresh (header, trade, deposit). */

export const SCW_BALANCE_INVALIDATE_EVENT = "pump:scw-balance-invalidate";
export const SCW_DEPOSIT_WATCH_EVENT = "pump:scw-deposit-watch";

const DEPOSIT_WATCH_UNTIL_KEY = "pump-scw-deposit-watch-until";

/** Default: watch for incoming deposits for 15 minutes after opening deposit UI. */
export const SCW_DEPOSIT_WATCH_MS = 15 * 60_000;

/** Poll interval while deposit watch is active (~7.5 req/min). */
export const SCW_DEPOSIT_WATCH_POLL_MS = 8_000;

/** Idle header refresh (~0.5 req/min) when not expecting a deposit. */
export const SCW_BALANCE_IDLE_POLL_MS = 120_000;

type InvalidateListener = () => void;
const invalidateListeners = new Set<InvalidateListener>();

export function subscribeScwBalanceInvalidate(listener: InvalidateListener): () => void {
  invalidateListeners.add(listener);
  return () => invalidateListeners.delete(listener);
}

/** Trigger wagmi balance refetch everywhere (trade confirm, withdraw, manual). */
export function invalidateScwBalance(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCW_BALANCE_INVALIDATE_EVENT));
  }
  for (const listener of invalidateListeners) {
    listener();
  }
}

export function startScwDepositWatch(durationMs = SCW_DEPOSIT_WATCH_MS): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + durationMs;
  sessionStorage.setItem(DEPOSIT_WATCH_UNTIL_KEY, String(until));
  window.dispatchEvent(new CustomEvent(SCW_DEPOSIT_WATCH_EVENT));
}

export function stopScwDepositWatch(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DEPOSIT_WATCH_UNTIL_KEY);
  window.dispatchEvent(new CustomEvent(SCW_DEPOSIT_WATCH_EVENT));
}

export function isScwDepositWatchActive(): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(DEPOSIT_WATCH_UNTIL_KEY);
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until) || Date.now() >= until) {
    sessionStorage.removeItem(DEPOSIT_WATCH_UNTIL_KEY);
    return false;
  }
  return true;
}

export function formatNativeDelta(deltaWei: bigint): string {
  const eth = Number(deltaWei) / 1e18;
  if (!Number.isFinite(eth) || eth <= 0) return "0";
  if (eth >= 1) return eth.toFixed(4).replace(/\.?0+$/, "");
  if (eth >= 0.0001) return eth.toFixed(4).replace(/\.?0+$/, "");
  return eth.toFixed(6).replace(/\.?0+$/, "");
}
