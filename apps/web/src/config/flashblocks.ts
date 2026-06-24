import {
  createPublicClient,
  http,
  webSocket,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { pumpChain, rpcUrl } from "@/config/chain";

/** Base Flashblocks preconfirmation target (~200ms). */
export const FLASHBLOCKS_POLL_MS = 200;
export const FLASHBLOCKS_INCLUSION_POLL_MS = 100;
export const FLASHBLOCKS_CONFIRMATIONS = 0;

const receiptWaitInflight = new Map<string, Promise<TransactionReceipt>>();

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Base mainnet / Base Sepolia — Flashblocks-supported networks. */
export function isPumpFlashblocksEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_FLASHBLOCKS_ENABLED === "0") return false;
  return pumpChain.id === BASE_SEPOLIA_CHAIN_ID || pumpChain.id === BASE_MAINNET_CHAIN_ID;
}

function readTradeRpcFromEnv(): string | undefined {
  const trade = process.env.NEXT_PUBLIC_TRADE_RPC_URL?.trim();
  if (trade && trade !== "CHANGE_ME") return trade;
  const legacy = process.env.NEXT_PUBLIC_FLASHBLOCKS_RPC_URL?.trim();
  if (legacy && legacy !== "CHANGE_ME") return legacy;
  return undefined;
}

function readTradeWsFromEnv(): string | undefined {
  for (const raw of [
    process.env.NEXT_PUBLIC_TRADE_WSS_URL,
    process.env.NEXT_PUBLIC_TRADE_WS_RPC_URL,
    process.env.NEXT_PUBLIC_FLASHBLOCKS_WS_RPC_URL,
  ]) {
    const value = raw?.trim();
    if (value && value !== "CHANGE_ME") return value;
  }
  return undefined;
}

/**
 * HTTPS Alchemy (Flashblocks-capable) — buy/sell UserOp prepare, simulate, HTTP receipt fallback.
 * Separate from NEXT_PUBLIC_RPC_URL (balances, arena, SSR).
 */
export function tradeRpcUrl(): string {
  return readTradeRpcFromEnv() ?? rpcUrl;
}

/**
 * WSS Alchemy — Flashblocks `newHeads` (~200ms) for trade confirm only.
 * Set NEXT_PUBLIC_TRADE_WSS_URL explicitly (do not rely on auto https→wss in production).
 */
export function tradeWsRpcUrl(): string {
  const explicit = readTradeWsFromEnv();
  if (explicit) return explicit;
  return httpRpcToWebSocketUrl(tradeRpcUrl()) ?? tradeRpcUrl();
}

export function httpRpcToWebSocketUrl(httpUrl: string): string | undefined {
  if (httpUrl.startsWith("https://")) {
    return `wss://${httpUrl.slice("https://".length)}`;
  }
  if (httpUrl.startsWith("http://")) {
    return `ws://${httpUrl.slice("http://".length)}`;
  }
  return undefined;
}

export function isTradeRpcConfigured(): boolean {
  return Boolean(readTradeRpcFromEnv());
}

export function isTradeWssConfigured(): boolean {
  return Boolean(readTradeWsFromEnv());
}

/** Fast buy/sell path: Base chain + dedicated TRADE_RPC_URL. */
export function isTradeFlashblocksActive(): boolean {
  return isPumpFlashblocksEnabled() && isTradeRpcConfigured();
}

export function getFlashblocksReceiptQueryConfig(): {
  confirmations?: number;
  pollingInterval?: number;
} {
  if (!isTradeFlashblocksActive()) return {};
  return {
    confirmations: FLASHBLOCKS_CONFIRMATIONS,
    pollingInterval: FLASHBLOCKS_POLL_MS,
  };
}

/** HTTPS trade client — UserOp gas reads + receipt HTTP fallback. */
export function createTradeHttpPublicClient(): PublicClient {
  return createPublicClient({
    chain: pumpChain,
    transport: http(tradeRpcUrl(), { timeout: 30_000 }),
    pollingInterval: FLASHBLOCKS_POLL_MS,
  });
}

/** WSS trade client — Flashblocks block stream (browser only). */
export function createTradeWebSocketPublicClient(): PublicClient {
  const useWs =
    typeof window !== "undefined" &&
    isTradeFlashblocksActive() &&
    isTradeWssConfigured();

  const transport = useWs
    ? webSocket(tradeWsRpcUrl(), { reconnect: true, timeout: 30_000 })
    : http(tradeRpcUrl(), { timeout: 30_000 });

  return createPublicClient({
    chain: pumpChain,
    transport,
    pollingInterval: FLASHBLOCKS_POLL_MS,
  });
}

/**
 * Wait for preconfirmed receipt via WSS newHeads (fast) or HTTP poll (fallback).
 * Returns the receipt so the UI does not need a second waiter.
 */
export async function waitForFlashblocksTransactionReceipt(
  hash: Hash,
  options?: { timeout?: number; client?: PublicClient; preferWs?: boolean }
): Promise<TransactionReceipt> {
  const key = hash.toLowerCase();
  const existing = receiptWaitInflight.get(key);
  if (existing) return existing;

  const promise = waitForFlashblocksTransactionReceiptInner(hash, options);
  receiptWaitInflight.set(key, promise);
  void promise.finally(() => {
    if (receiptWaitInflight.get(key) === promise) {
      receiptWaitInflight.delete(key);
    }
  });
  return promise;
}

async function waitForFlashblocksTransactionReceiptInner(
  hash: Hash,
  options?: { timeout?: number; client?: PublicClient; preferWs?: boolean }
): Promise<TransactionReceipt> {
  const timeout = options?.timeout ?? 60_000;
  const preferWs =
    options?.preferWs !== false &&
    typeof window !== "undefined" &&
    isTradeWssConfigured();

  if (preferWs) {
    try {
      return await waitForFlashblocksTransactionReceiptWs(hash, {
        timeout,
        client: options?.client ?? createTradeWebSocketPublicClient(),
      });
    } catch {
      // fall through to HTTP
    }
  }

  const client = options?.client ?? createTradeHttpPublicClient();
  return client.waitForTransactionReceipt({
    hash,
    confirmations: FLASHBLOCKS_CONFIRMATIONS,
    pollingInterval: FLASHBLOCKS_POLL_MS,
    timeout,
  });
}

async function waitForFlashblocksTransactionReceiptWs(
  hash: Hash,
  options: { timeout: number; client: PublicClient }
): Promise<TransactionReceipt> {
  const { client, timeout } = options;
  const deadline = Date.now() + timeout;

  return new Promise<TransactionReceipt>((resolve, reject) => {
    let settled = false;
    let unwatch: (() => void) | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      unwatch?.();
      fn();
    };

    const check = async () => {
      if (Date.now() > deadline) {
        finish(() =>
          reject(new Error(`Flashblocks WSS timeout waiting for ${hash}`))
        );
        return;
      }
      try {
        const receipt = await client.getTransactionReceipt({ hash });
        if (receipt) {
          finish(() => resolve(receipt));
        }
      } catch {
        // receipt not available yet
      }
    };

    void check();

    try {
      unwatch = client.watchBlocks({
        onBlock: () => {
          void check();
        },
        onError: (error) => {
          finish(() => reject(error));
        },
      });
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error(String(error)))
      );
    }

    setTimeout(() => {
      finish(() =>
        reject(new Error(`Flashblocks WSS timeout waiting for ${hash}`))
      );
    }, timeout);
  });
}
