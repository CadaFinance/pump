import { explorerTxUrl } from "@/config/chain";
import { toast } from "@/lib/toast";
import { playTradeSound } from "@/lib/trade-sounds";

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
  toast.loading(`${count} orders confirming`, "Settling on-chain in the background.", {
    id: TRADE_AGGREGATE_ID,
  });
}

function finishTradeOrderToast(
  pendingId: string,
  tone: "success" | "error",
  title: string,
  description: string,
  durationMs: number
): void {
  const toastId = tradeOrderToastId(pendingId);
  toast.dismiss(toastId);
  if (tone === "success") {
    toast.success(title, description, { durationMs });
  } else {
    toast.error(title, description, { durationMs });
  }
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
    action: undefined,
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
  finishTradeOrderToast(
    pendingId,
    "success",
    side === "buy" ? `Buy ${symbol} confirmed` : `Sell ${symbol} confirmed`,
    "Balances and chart will update shortly.",
    3_500
  );
  playTradeSound(side === "buy" ? "buy_confirmed" : "sell_confirmed");
  refreshAggregateToast();
}

export function trackTradeOrderFailed(pendingId: string, message: string): void {
  activeTradeOrders.delete(pendingId);
  finishTradeOrderToast(pendingId, "error", "Order failed", message, 6_000);
  playTradeSound("trade_failed");
  refreshAggregateToast();
}

export function untrackTradeOrder(pendingId: string): void {
  if (!activeTradeOrders.delete(pendingId)) return;
  toast.dismiss(tradeOrderToastId(pendingId));
  refreshAggregateToast();
}
