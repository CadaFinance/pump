import { parseGwei } from "viem";
import { getBundlerRpcUrl } from "@/lib/aa/bundler-config";

/** BSC mainnet priority fee is ~0.1 gwei (2026). Legacy 1 gwei floors overcharged users ~10×. */
export const MIN_USER_OP_MAX_FEE = parseGwei("0.1");
export const MIN_USER_OP_PRIORITY_FEE = parseGwei("0.1");

type GasTier = { maxFeePerGas: string; maxPriorityFeePerGas: string };
type PimlicoGasTiers = { slow: GasTier; standard: GasTier; fast: GasTier };

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

function clampUserOpFees(maxFeePerGas: bigint, maxPriorityFeePerGas: bigint) {
  const priority = maxBigInt(maxPriorityFeePerGas, MIN_USER_OP_PRIORITY_FEE);
  const maxFee = maxBigInt(maxFeePerGas, maxBigInt(priority, MIN_USER_OP_MAX_FEE));
  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
}

function clampGasTier(tier: GasTier) {
  return clampUserOpFees(BigInt(tier.maxFeePerGas), BigInt(tier.maxPriorityFeePerGas));
}

type GasTierPreference = "standard" | "fast";

/** Pimlico-recommended gas for UserOps (via bundler proxy). */
export async function fetchPimlicoUserOpGasPrice(
  preference: GasTierPreference = "standard"
): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
} | null> {
  const response = await fetch(getBundlerRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "pimlico_getUserOperationGasPrice",
      params: [],
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    result?: PimlicoGasTiers;
    error?: { message?: string };
  };

  const tiers = payload.result;
  if (!tiers) return null;

  const tier =
    preference === "fast"
      ? (tiers.fast ?? tiers.standard ?? tiers.slow)
      : (tiers.standard ?? tiers.fast ?? tiers.slow);
  if (!tier) return null;

  return clampGasTier(tier);
}

function feesFromChainGasPrice(gasPrice: bigint) {
  const priority = maxBigInt(gasPrice, MIN_USER_OP_PRIORITY_FEE);
  return clampUserOpFees(gasPrice, priority);
}

async function resolveUserOpGasPriceWithPreference(
  chainGasPrice: () => Promise<bigint>,
  preference: GasTierPreference
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  const [chainFees, bundler] = await Promise.all([
    chainGasPrice()
      .then((gasPrice) => (gasPrice > 0n ? feesFromChainGasPrice(gasPrice) : null))
      .catch(() => null),
    fetchPimlicoUserOpGasPrice(preference).catch(() => null),
  ]);

  if (chainFees && bundler) {
    return clampUserOpFees(
      maxBigInt(chainFees.maxFeePerGas, bundler.maxFeePerGas),
      maxBigInt(chainFees.maxPriorityFeePerGas, bundler.maxPriorityFeePerGas)
    );
  }

  if (chainFees) return chainFees;
  if (bundler) return bundler;

  return {
    maxFeePerGas: MIN_USER_OP_MAX_FEE,
    maxPriorityFeePerGas: MIN_USER_OP_PRIORITY_FEE,
  };
}

export async function resolveUserOpGasPrice(
  chainGasPrice: () => Promise<bigint>
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  return resolveUserOpGasPriceWithPreference(chainGasPrice, "standard");
}

/** Buy/sell — prefer bundler `fast` tier for quicker executor inclusion. */
export async function resolveTradeUserOpGasPrice(
  chainGasPrice: () => Promise<bigint>
): Promise<{ maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
  return resolveUserOpGasPriceWithPreference(chainGasPrice, "fast");
}
