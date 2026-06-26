import type { Address, PublicClient } from "viem";
import { NATIVE_SYMBOL } from "@/config/chain";
import { assertScwReadyForUserOp } from "@/lib/aa/scw-preflight";
import {
  DEFAULT_BUY_CALL_GAS,
  userOpPrefundFromCallGasEstimate,
} from "@/lib/aa/user-op-prefund";
import {
  quoteBuyFromCurveState,
  quoteSellFromCurveState,
  type BondingCurveState,
} from "@/lib/bonding-curve";

export type InstantTradeGateInput = {
  side: "buy" | "sell";
  paused: boolean;
  wrongChain: boolean;
  needsLegacyApproval: boolean;
  sellUsesPermit: boolean;
  allowanceSufficient: boolean;
  bondingCurve?: BondingCurveState;
  protocolFeeBps?: bigint;
  buyCostWei: bigint;
  sellTokenWei: bigint;
  bnbBalance?: bigint;
  tokenBalance?: bigint;
  /** Spendable native balance after in-flight trade reservations. */
  availableBnbBalance?: bigint;
  /** Spendable token balance after in-flight trade reservations. */
  availableTokenBalance?: bigint;
  /** Kernel UserOp prefund wei (verification + call + preVerification) × maxFeePerGas. */
  buyGasReserveWei: bigint;
  sellGasReserveWei: bigint;
  /** Extra prefund when sell requires a separate ERC20 approve UserOp (SCW path). */
  legacyApproveGasReserveWei?: bigint;
  maxBuySpendWei: bigint;
  maxFeePerGasWei?: bigint;
};

export type InstantTradeGateBuy = {
  ok: true;
  side: "buy";
  submitValue: bigint;
  tokenOut: bigint;
  feeZug: bigint;
};

export type InstantTradeGateSell = {
  ok: true;
  side: "sell";
  sellTokenWei: bigint;
  zugOut: bigint;
  feeZug: bigint;
};

export type InstantTradeGateFail = {
  ok: false;
  reason: string;
};

export type InstantTradeGateResult =
  | InstantTradeGateBuy
  | InstantTradeGateSell
  | InstantTradeGateFail;

function tradeUserOpPrefundWei(
  side: "buy" | "sell",
  input: InstantTradeGateInput
): bigint {
  const panelPrefund =
    side === "buy" ? input.buyGasReserveWei : input.sellGasReserveWei;
  const legacyApprove =
    side === "sell" && input.needsLegacyApproval
      ? (input.legacyApproveGasReserveWei ?? 0n)
      : 0n;
  return panelPrefund + legacyApprove;
}

function fallbackBuyPrefundWei(maxFeePerGasWei?: bigint): bigint {
  if (maxFeePerGasWei == null || maxFeePerGasWei <= 0n) return 0n;
  return userOpPrefundFromCallGasEstimate(DEFAULT_BUY_CALL_GAS, maxFeePerGasWei);
}

/** UserOp prefund reserved for a buy — same value the gate uses for Max / balance checks. */
export function computeConservativeBuyGasReserve(
  buyGasReserveWei: bigint,
  maxFeePerGasWei?: bigint
): bigint {
  if (buyGasReserveWei > 0n) return buyGasReserveWei;
  return fallbackBuyPrefundWei(maxFeePerGasWei);
}

export function computeConservativeSellGasReserve(
  sellGasReserveWei: bigint,
  maxFeePerGasWei?: bigint,
  legacyApproveGasReserveWei?: bigint,
  needsLegacyApproval = false
): bigint {
  const sellPrefund =
    sellGasReserveWei > 0n
      ? sellGasReserveWei
      : fallbackBuyPrefundWei(maxFeePerGasWei);
  const approvePrefund =
    needsLegacyApproval && legacyApproveGasReserveWei != null
      ? legacyApproveGasReserveWei
      : 0n;
  return sellPrefund + approvePrefund;
}

/** Max ETH spend for buy that still passes the instant gate (balance − UserOp prefund). */
export function computeMaxBuySpendWei(
  availableNativeWei: bigint,
  buyGasReserveWei: bigint,
  maxFeePerGasWei?: bigint
): bigint {
  const prefund = computeConservativeBuyGasReserve(buyGasReserveWei, maxFeePerGasWei);
  if (availableNativeWei <= prefund) return 0n;
  return availableNativeWei - prefund;
}

/**
 * Synchronous gate — only returns ok when cached balances + UserOp prefund math pass.
 * Used for 0ms optimistic UI; must pair with `hardValidateInstantTrade` before send.
 */
export function evaluateInstantTradeGate(
  input: InstantTradeGateInput
): InstantTradeGateResult {
  if (input.wrongChain) return { ok: false, reason: "wrong_chain" };
  if (input.paused) return { ok: false, reason: "paused" };
  if (input.bnbBalance === undefined && input.availableBnbBalance === undefined) {
    return { ok: false, reason: "bnb_unknown" };
  }
  if (!input.bondingCurve || input.protocolFeeBps === undefined) {
    return { ok: false, reason: "curve_unavailable" };
  }

  const prefund = tradeUserOpPrefundWei(input.side, input);
  if (prefund <= 0n) return { ok: false, reason: "gas_reserve_unknown" };

  const nativeBalance = input.availableBnbBalance ?? input.bnbBalance!;
  const tokenBalance = input.availableTokenBalance ?? input.tokenBalance;

  if (input.side === "buy") {
    if (input.buyCostWei <= 0n) return { ok: false, reason: "zero_amount" };
    const submitValue =
      input.buyCostWei > input.maxBuySpendWei ? input.maxBuySpendWei : input.buyCostWei;
    if (submitValue <= 0n) return { ok: false, reason: "insufficient_bnb" };
    if (submitValue + prefund > nativeBalance) {
      return { ok: false, reason: "insufficient_bnb_gas" };
    }

    const { tokenOut, feeZug } = quoteBuyFromCurveState(
      input.bondingCurve,
      input.protocolFeeBps,
      submitValue
    );
    if (tokenOut <= 0n) return { ok: false, reason: "quote_zero" };

    return { ok: true, side: "buy", submitValue, tokenOut, feeZug };
  }

  if (input.sellTokenWei <= 0n) return { ok: false, reason: "zero_amount" };
  if (tokenBalance === undefined) return { ok: false, reason: "token_unknown" };
  if (input.sellTokenWei > tokenBalance) {
    return { ok: false, reason: "insufficient_token" };
  }
  if (nativeBalance < prefund) {
    return { ok: false, reason: "insufficient_gas" };
  }

  if (input.needsLegacyApproval) {
    // SCW cannot EIP-2612 permit — approve + sell; prefund includes both UserOps.
  } else if (input.sellUsesPermit) {
    // Permit signs in background — allowance not required on-chain yet.
  } else if (!input.allowanceSufficient) {
    return { ok: false, reason: "allowance" };
  }

  const { ethOut, feeZug } = quoteSellFromCurveState(
    input.bondingCurve,
    input.protocolFeeBps,
    input.sellTokenWei
  );
  if (ethOut <= 0n) return { ok: false, reason: "quote_zero" };

  return {
    ok: true,
    side: "sell",
    sellTokenWei: input.sellTokenWei,
    zugOut: ethOut,
    feeZug,
  };
}

export type HardValidateInstantTradeInput = {
  scwAddress: Address;
  side: "buy" | "sell";
  callValueWei: bigint;
  bnbBalanceWei: bigint;
  tokenBalanceWei?: bigint;
  sellTokenWei?: bigint;
  /** UserOp prefund wei from prepareUserOperation or panel estimate. */
  userOpPrefundWei: bigint;
  publicClient?: PublicClient;
};

/** Async re-check immediately before UserOp submit (after optimistic UI). */
export async function hardValidateInstantTrade(
  input: HardValidateInstantTradeInput
): Promise<void> {
  const prefund = input.userOpPrefundWei;
  if (prefund <= 0n) {
    throw new Error("Network fee estimate unavailable.");
  }

  if (input.side === "buy") {
    if (input.callValueWei + prefund > input.bnbBalanceWei) {
      throw new Error(`Insufficient ${NATIVE_SYMBOL} for trade and gas.`);
    }
  } else {
    const sellWei = input.sellTokenWei ?? 0n;
    if (sellWei <= 0n) throw new Error("Enter a valid amount.");
    if (input.tokenBalanceWei !== undefined && sellWei > input.tokenBalanceWei) {
      throw new Error("Insufficient token balance.");
    }
    if (input.bnbBalanceWei < prefund) {
      throw new Error(`Insufficient ${NATIVE_SYMBOL} for network fees.`);
    }
  }

  await assertScwReadyForUserOp(
    input.scwAddress,
    input.side === "buy" ? input.callValueWei : 0n,
    input.publicClient,
    prefund
  );
}

export function createOptimisticPendingId(): string {
  return `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
