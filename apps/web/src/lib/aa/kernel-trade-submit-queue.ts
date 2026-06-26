import { tradeTraceStep } from "@/lib/trade-timing";

const MAX_SUBMIT_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;

let submitChain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableSubmitError(err: unknown): boolean {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("429") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("nonce") ||
    message.includes("replacement") ||
    message.includes("already known")
  );
}

async function runWithSubmitRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_SUBMIT_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 1) {
        tradeTraceStep("bundler.submit.retry", { attempt });
      }
      return await run();
    } catch (err) {
      lastError = err;
      const retryable = isRetryableSubmitError(err);
      if (!retryable || attempt === MAX_SUBMIT_ATTEMPTS) {
        throw err instanceof Error ? err : new Error(String(err));
      }
      const delayMs = RETRY_BASE_MS * 2 ** (attempt - 1);
      tradeTraceStep("bundler.submit.retry.wait", { attempt, delayMs });
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Serializes bundler UserOp submission so rapid trades don't collide on SCW nonce.
 * Confirmation still runs in parallel after each submit completes.
 */
export function enqueueKernelSubmit<T>(run: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    submitChain = submitChain
      .then(async () => {
        try {
          const result = await runWithSubmitRetry(run);
          resolve(result);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .catch(() => {
        /* Keep queue alive after a failed job. */
      });
  });
}
