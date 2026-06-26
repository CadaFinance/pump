import { explorerTxUrl } from "@/config/chain";
import { toast } from "@/lib/toast";

const TRADE_ORDER_PREFIX = "trade-order-";
const TRADE_AGGREGATE_ID = "trade-orders-aggregate";

const activeTradeOrders = new Set<string>();

function tradeOrderToastId(pendingId: string): string {
  return `${TRADE_ORDER_PREFIX}${pendingId}`;
}

function sideTitle(side: "buy" | "sell", symbol: string): string {
  return side === "buy" ? `Buy ${symbol}` : `Sell ${symbol}`;
}

function refreshAggregateToast(): void {
  const count = activeTradeOrders.size;
  if (count <= 1) {
    toast.dismiss(TRADE_AGGREGATE_ID);
    return;
  }
  const title = `${count} orders confirming`;
  const description = "Settling on-chain in the background.";
  toast.loading(title, description, { id: TRADE_AGGREGATE_ID });
}

export function trackTradeOrderPending(
  pendingId: string,
  side: "buy" | "sell",
  symbol: string
): void {
  activeTradeOrders.add(pendingId);
  toast.loading(sideTitle(side, symbol), "Submitting to bundler…", {
    id: tradeOrderToastId(pendingId),
  });
  refreshAggregateToast();
}

export function trackTradeOrderSubmitted(
  pendingId: string,
  side: "buy" | "sell",
  symbol: string
): void {
  activeTradeOrders.add(pendingId);
  toast.update(tradeOrderToastId(pendingId), {
    tone: "loading",
    title: sideTitle(side, symbol),
    description: "Confirming on-chain…",
    persistent: true,
  });
  refreshAggregateToast();
}

export function trackTradeOrderIncluded(pendingId: string, txHash: string): void {
  toast.update(tradeOrderToastId(pendingId), {
    description: "Confirming on-chain…",
    action: { label: "View tx", href: explorerTxUrl(txHash) },
    persistent: true,
    tone: "loading",
  });
}

export function trackTradeOrderConfirmed(
  pendingId: string,
  side: "buy" | "sell",
  symbol: string
): void {
  activeTradeOrders.delete(pendingId);
  toast.success(
    side === "buy" ? `Buy ${symbol} confirmed` : `Sell ${symbol} confirmed`,
    "Balances and chart will update shortly.",
    { id: tradeOrderToastId(pendingId), durationMs: 3_500 }
  );
  refreshAggregateToast();
}

export function trackTradeOrderFailed(pendingId: string, message: string): void {
  activeTradeOrders.delete(pendingId);
  toast.error("Order failed", message, { id: tradeOrderToastId(pendingId), durationMs: 6_000 });
  refreshAggregateToast();
}

export function untrackTradeOrder(pendingId: string): void {
  if (!activeTradeOrders.delete(pendingId)) return;
  toast.dismiss(tradeOrderToastId(pendingId));
  refreshAggregateToast();
}
