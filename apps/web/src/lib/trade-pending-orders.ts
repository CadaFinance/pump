export type TradePendingOrderPhase = "submitting" | "confirming";

export type TradePendingOrder = {
  id: string;
  side: "buy" | "sell";
  phase: TradePendingOrderPhase;
  userOpHash?: string;
  txHash?: string;
};

export function appendPendingOrder(
  orders: TradePendingOrder[],
  order: TradePendingOrder
): TradePendingOrder[] {
  return [...orders.filter((o) => o.id !== order.id), order];
}

export function patchPendingOrder(
  orders: TradePendingOrder[],
  id: string,
  patch: Partial<Omit<TradePendingOrder, "id">>
): TradePendingOrder[] {
  return orders.map((order) => (order.id === id ? { ...order, ...patch } : order));
}

export function removePendingOrder(orders: TradePendingOrder[], id: string): TradePendingOrder[] {
  return orders.filter((order) => order.id !== id);
}

export function pendingOrderPhaseLabel(phase: TradePendingOrderPhase): string {
  return phase === "submitting" ? "Submitting" : "Confirming";
}
