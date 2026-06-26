import type { Hash } from "viem";
import { explorerTxUrl } from "@/config/chain";
import { toast } from "@/lib/toast";
import { playTradeSound } from "@/lib/trade-sounds";

const TRADE_ORDER_PREFIX = "trade-order-";
const TRADE_AGGREGATE_ID = "trade-orders-aggregate";
const TRADE_BATCH_SUCCESS_ID = "trade-batch-success";

/** Terminal success toast — short, auto-dismiss (Phantom/Binance pattern). */
const SUCCESS_DURATION_MS = 2_500;
const BATCH_WINDOW_MS = 3_000;

type PendingMeta = {
  side: "buy" | "sell";
  symbol: string;
  userOpHash?: Hash;
  txHash?: Hash;
};

const activeTradeOrders = new Set<string>();
const settledTradeOrders = new Set<string>();
const pendingMeta = new Map<string, PendingMeta>();
const txHashToPendingId = new Map<string, string>();
const userOpToPendingId = new Map<string, string>();

let batchConfirmCount = 0;
let batchConfirmTimer: ReturnType<typeof setTimeout> | null = null;

function tradeOrderToastId(pendingId: string): string {
  return `${TRADE_ORDER_PREFIX}${pendingId}`;
}

function sideTitle(side: "buy" | "sell", symbol: string): string {
  return side === "buy" ? `Buy ${symbol}` : `Sell ${symbol}`;
}

function resetBatchConfirmWindow(): void {
  batchConfirmCount = 0;
  batchConfirmTimer = null;
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
  description: string | undefined,
  durationMs: number
): void {
  toast.update(tradeOrderToastId(pendingId), {
    tone,
    title,
    description,
    persistent: false,
    durationMs,
    action: undefined,
  });
}

export function isTradeOrderSettled(pendingId: string): boolean {
  return settledTradeOrders.has(pendingId);
}

export function resolvePendingIdFromTxHash(txHash: string): string | undefined {
  return txHashToPendingId.get(txHash.toLowerCase());
}

export function resolvePendingIdFromUserOp(userOpHash: string): string | undefined {
  return userOpToPendingId.get(userOpHash.toLowerCase());
}

export function registerTradeOrderUserOp(pendingId: string, userOpHash: Hash): void {
  userOpToPendingId.set(userOpHash.toLowerCase(), pendingId);
  const meta = pendingMeta.get(pendingId);
  if (meta) meta.userOpHash = userOpHash;
  else pendingMeta.set(pendingId, { side: "buy", symbol: "", userOpHash });
}

export function registerTradeOrderTxHash(pendingId: string, txHash: Hash): void {
  txHashToPendingId.set(txHash.toLowerCase(), pendingId);
  const meta = pendingMeta.get(pendingId);
  if (meta) meta.txHash = txHash;
}

export function trackTradeOrderPending(
  pendingId: string,
  side: "buy" | "sell",
  symbol: string
): void {
  settledTradeOrders.delete(pendingId);
  activeTradeOrders.add(pendingId);
  pendingMeta.set(pendingId, { side, symbol });
  toast.loading(sideTitle(side, symbol), "Submitting to bundler…", {
    id: tradeOrderToastId(pendingId),
  });
  refreshAggregateToast();
}

export function trackTradeOrderSubmitted(
  pendingId: string,
  side: "buy" | "sell",
  symbol: string,
  userOpHash?: Hash
): void {
  if (isTradeOrderSettled(pendingId)) return;
  activeTradeOrders.add(pendingId);
  pendingMeta.set(pendingId, { side, symbol, userOpHash, txHash: pendingMeta.get(pendingId)?.txHash });
  if (userOpHash) registerTradeOrderUserOp(pendingId, userOpHash);
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
  if (isTradeOrderSettled(pendingId)) return;
  registerTradeOrderTxHash(pendingId, txHash as Hash);
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
  if (settledTradeOrders.has(pendingId)) {
    toast.dismiss(tradeOrderToastId(pendingId));
    activeTradeOrders.delete(pendingId);
    refreshAggregateToast();
    return;
  }

  settledTradeOrders.add(pendingId);
  activeTradeOrders.delete(pendingId);

  batchConfirmCount += 1;
  if (batchConfirmTimer != null) clearTimeout(batchConfirmTimer);
  batchConfirmTimer = setTimeout(resetBatchConfirmWindow, BATCH_WINDOW_MS);

  const title = side === "buy" ? `Buy ${symbol} confirmed` : `Sell ${symbol} confirmed`;

  if (batchConfirmCount >= 2) {
    for (const id of settledTradeOrders) {
      toast.dismiss(tradeOrderToastId(id));
    }
    toast.success(`${batchConfirmCount} orders confirmed`, undefined, {
      id: TRADE_BATCH_SUCCESS_ID,
      durationMs: SUCCESS_DURATION_MS,
    });
  } else {
    finishTradeOrderToast(pendingId, "success", title, undefined, SUCCESS_DURATION_MS);
  }

  playTradeSound(side === "buy" ? "buy_confirmed" : "sell_confirmed");
  refreshAggregateToast();
}

export function trackTradeOrderFailed(pendingId: string, message: string): void {
  if (settledTradeOrders.has(pendingId)) {
    toast.dismiss(tradeOrderToastId(pendingId));
    activeTradeOrders.delete(pendingId);
    refreshAggregateToast();
    return;
  }
  settledTradeOrders.add(pendingId);
  activeTradeOrders.delete(pendingId);
  finishTradeOrderToast(pendingId, "error", "Order failed", message, 6_000);
  playTradeSound("trade_failed");
  refreshAggregateToast();
}

export function forceDismissTradeOrderToast(pendingId: string): void {
  settledTradeOrders.add(pendingId);
  activeTradeOrders.delete(pendingId);
  toast.dismiss(tradeOrderToastId(pendingId));
  refreshAggregateToast();
}

export function untrackTradeOrder(pendingId: string): void {
  if (!activeTradeOrders.delete(pendingId)) return;
  toast.dismiss(tradeOrderToastId(pendingId));
  refreshAggregateToast();
}

export function isTradeOrderActive(pendingId: string): boolean {
  return activeTradeOrders.has(pendingId) && !settledTradeOrders.has(pendingId);
}

export function getActiveTradeOrderIds(): string[] {
  return [...activeTradeOrders].filter((id) => !settledTradeOrders.has(id));
}
