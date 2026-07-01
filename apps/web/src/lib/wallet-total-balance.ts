export type WalletTotalSnapshot = {
  address: string;
  holdingsUsd: number;
  nativeBnb: number;
  nativeUsd: number;
  totalUsd: number;
};

export const WALLET_TOTAL_EVENT = "pump:wallet-total";

const cache = new Map<string, WalletTotalSnapshot>();

export function publishWalletTotal(snapshot: WalletTotalSnapshot): void {
  const key = snapshot.address.toLowerCase();
  cache.set(key, snapshot);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WALLET_TOTAL_EVENT, { detail: snapshot }));
  }
}

export function getCachedWalletTotal(address: string): WalletTotalSnapshot | null {
  return cache.get(address.toLowerCase()) ?? null;
}

export function subscribeWalletTotal(
  listener: (snapshot: WalletTotalSnapshot) => void
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<WalletTotalSnapshot>).detail;
    if (detail?.address) listener(detail);
  };

  window.addEventListener(WALLET_TOTAL_EVENT, onEvent);
  return () => window.removeEventListener(WALLET_TOTAL_EVENT, onEvent);
}

export function sumSnapshotHoldingsBnb(
  positions: Array<{ estimatedValueBnb?: number; tokenBalance: string; lastPriceBnb: string }>
): number {
  return positions.reduce((sum, position) => {
    if (position.estimatedValueBnb != null && Number.isFinite(position.estimatedValueBnb)) {
      return sum + position.estimatedValueBnb;
    }
    const balance = Number(position.tokenBalance);
    const price = Number(position.lastPriceBnb);
    if (!Number.isFinite(balance) || !Number.isFinite(price)) return sum;
    return sum + balance * price;
  }, 0);
}
