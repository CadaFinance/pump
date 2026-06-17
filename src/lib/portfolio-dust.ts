import { bnbToUsd } from "@/lib/format-usd";
import { PORTFOLIO_DUST_MIN_VALUE_USD } from "@/lib/portfolio-limits";

const SHOW_DUST_STORAGE_KEY = "pump-portfolio-show-dust";

export function readPortfolioShowDust(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHOW_DUST_STORAGE_KEY) === "true";
}

export function writePortfolioShowDust(show: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHOW_DUST_STORAGE_KEY, show ? "true" : "false");
}

/** True when USD value is known and below the dust floor. Unknown price → not dust. */
export function isPortfolioDustHolding(
  estimatedValueBnb: number,
  bnbUsd: number | null | undefined,
  minUsd = PORTFOLIO_DUST_MIN_VALUE_USD
): boolean {
  const usd = bnbToUsd(estimatedValueBnb, bnbUsd);
  if (usd == null) return false;
  return usd < minUsd;
}

export function portfolioDustLabel(count: number): string {
  return count === 1 ? "Show 1 dust position" : `Show ${count} dust positions`;
}
