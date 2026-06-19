export function formatTradeError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "shortMessage" in err
        ? String((err as { shortMessage: string }).shortMessage)
        : String(err);

  const lower = raw.toLowerCase();

  if (lower.includes("validateuserop") || lower.includes("aa23") || lower.includes("-32500")) {
    return "Transaction rejected (AA23) — deposit BNB to your smart wallet address (not login wallet) for trade amount + gas, then retry.";
  }
  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "Transaction cancelled in wallet.";
  }
  if (lower.includes("insufficient funds")) {
    return "Insufficient BNB balance for this trade.";
  }
  if (lower.includes("pausedorgraduated") || lower.includes("paused()")) {
    return "Trading is closed for this token.";
  }
  if (lower.includes("unknowntoken")) {
    return "This token is not registered on the bonding curve. Check contract addresses.";
  }
  if (lower.includes("slippage")) {
    return "Price moved — try again with a smaller amount.";
  }
  if (lower.includes("insufficientoutput")) {
    return "Trade amount too small after fees.";
  }
  if (lower.includes("insufficientallowance")) {
    return "Token approval missing — approve again, then sell.";
  }
  if (lower.includes("transferfailed")) {
    return "Token transfer failed — check balance and approval.";
  }

  return raw.length > 180 ? `${raw.slice(0, 180)}…` : raw;
}
