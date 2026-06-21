/** Minimum ERC20 balance treated as a non-zero holding. */
export const ON_CHAIN_BALANCE_EPSILON = 1e-6;

/** Prefer on-chain balance when verified; hide ghost indexer rows when on-chain is zero. */
export function resolveVerifiedTokenBalance(
  indexedBalance: number,
  onChainBalance: number | null | undefined
): { displayBalance: number; hidden: boolean; verified: boolean } {
  if (onChainBalance == null || !Number.isFinite(onChainBalance)) {
    return {
      displayBalance: indexedBalance,
      hidden: indexedBalance <= ON_CHAIN_BALANCE_EPSILON,
      verified: false,
    };
  }

  if (onChainBalance <= ON_CHAIN_BALANCE_EPSILON) {
    return { displayBalance: 0, hidden: true, verified: true };
  }

  return { displayBalance: onChainBalance, hidden: false, verified: true };
}

/** Scale cost basis when on-chain balance is lower than indexed balance. */
export function scaleCostBasisForBalance(
  costBasisBnb: number,
  indexedBalance: number,
  displayBalance: number
): number {
  if (!Number.isFinite(costBasisBnb) || costBasisBnb <= 0) return 0;
  if (!Number.isFinite(indexedBalance) || indexedBalance <= 0) return 0;
  if (!Number.isFinite(displayBalance) || displayBalance <= 0) return 0;
  if (displayBalance >= indexedBalance) return costBasisBnb;
  return costBasisBnb * (displayBalance / indexedBalance);
}
