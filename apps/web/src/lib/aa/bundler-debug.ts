type BundlerLogLevel = "info" | "warn" | "error";

function isBundlerDebugEnabled(): boolean {
  if (typeof window !== "undefined") {
    return (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_BUNDLER_DEBUG === "1"
    );
  }
  return process.env.BUNDLER_DEBUG === "1" || process.env.NODE_ENV === "development";
}

function summarizeRpcResult(method: string, payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  if ("error" in record) return record.error;
  if ("result" in record) {
    const result = record.result;
    if (method === "eth_sendUserOperation" && typeof result === "string") {
      return { userOpHash: result };
    }
    if (method === "eth_estimateUserOperationGas" && result && typeof result === "object") {
      const gas = result as Record<string, unknown>;
      return {
        preVerificationGas: gas.preVerificationGas,
        verificationGasLimit: gas.verificationGasLimit,
        callGasLimit: gas.callGasLimit,
        maxFeePerGas: gas.maxFeePerGas,
      };
    }
    if (method === "eth_getUserOperationReceipt") {
      if (result === null) return null;
      if (typeof result === "object") {
        const receipt = result as Record<string, unknown>;
        const nested = receipt.receipt as Record<string, unknown> | undefined;
        return {
          success: receipt.success,
          userOpHash: receipt.userOpHash,
          transactionHash: nested?.transactionHash,
          reason: receipt.reason,
        };
      }
    }
    return result;
  }
  return payload;
}

export function bundlerDebug(
  level: BundlerLogLevel,
  phase: string,
  method: string,
  detail?: unknown
): void {
  if (!isBundlerDebugEnabled()) return;

  const prefix = `[pump:bundler] ${phase} ${method}`;
  const summary = summarizeRpcResult(method, detail);

  if (level === "error") {
    console.error(prefix, summary);
    return;
  }
  if (level === "warn") {
    console.warn(prefix, summary);
    return;
  }
  console.info(prefix, summary);
}

export function tradeBundlerLog(phase: string, detail?: Record<string, unknown>): void {
  if (!isBundlerDebugEnabled()) return;
  console.info(`[pump:trade] ${phase}`, detail ?? {});
}
