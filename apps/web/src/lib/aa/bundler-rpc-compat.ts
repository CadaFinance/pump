export type JsonRpcPayload = {
  jsonrpc?: string;
  id?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

/** Skandha uses -32601 for pending/missing userOpHash; viem expects `result: null`. */
export function isReceiptPendingError(error: { code?: number; message?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("userophash") ||
    msg.includes("user operation not found") ||
    msg.includes("missing/invalid userophash") ||
    msg.includes("failed to get user operation receipt") ||
    msg.includes("failed to get useroperation receipt") ||
    (error.code === -32601 && msg.includes("receipt"))
  );
}

export function normalizeBundlerRpcPayload(
  method: string,
  payload: JsonRpcPayload
): JsonRpcPayload {
  if (!payload.error) return payload;

  const pendingLookup =
    method === "eth_getUserOperationReceipt" || method === "eth_getUserOperationByHash";

  if (pendingLookup && isReceiptPendingError(payload.error)) {
    return {
      jsonrpc: payload.jsonrpc ?? "2.0",
      id: payload.id,
      result: null,
    };
  }

  return payload;
}

export function parseJsonRpcRequestBody(body: string): { method?: string; id?: unknown } | null {
  try {
    const parsed = JSON.parse(body) as { method?: string; id?: unknown };
    return parsed;
  } catch {
    return null;
  }
}
