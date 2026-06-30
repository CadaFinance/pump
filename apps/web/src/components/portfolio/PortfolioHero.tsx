"use client";

import Link from "next/link";
import { PctChange } from "@/components/ui/PctChange";
import { useWalletFunding } from "@/components/wallet/WalletFundingProvider";
import { shortAddress } from "@/config/chain";
import { formatPortfolioHoldingValueUsd, formatUsdReadable } from "@/lib/format-usd";

type PortfolioHeroProps = {
  walletAddress: string;
  onOpenFollowing: () => void;
  onOpenFollowers: () => void;
  followingCount: number;
  followerCount: number;
  totalValueUsd: number | null;
  totalNetPnlUsd: number;
  portfolioValuePct: number | null;
  holdingsCount: number;
  totalUnrealizedPnlUsd: number;
  totalRealizedPnlUsd: number;
  valueFlashClass?: string;
  pnlFlashClass?: string;
};

function pnlTone(value: number): string {
  if (value > 0) return "text-pump-success";
  if (value < 0) return "text-pump-danger";
  return "text-pump-muted";
}

export function PortfolioHero({
  walletAddress,
  onOpenFollowing,
  onOpenFollowers,
  followingCount,
  followerCount,
  totalValueUsd,
  totalNetPnlUsd,
  portfolioValuePct,
  holdingsCount,
  totalUnrealizedPnlUsd,
  totalRealizedPnlUsd,
  valueFlashClass = "",
  pnlFlashClass = "",
}: PortfolioHeroProps) {
  const { openDeposit, openWithdraw } = useWalletFunding();
  const displayValue =
    totalValueUsd != null && Number.isFinite(totalValueUsd)
      ? formatPortfolioHoldingValueUsd(totalValueUsd)
      : "$0.00";

  return (
    <section className="portfolio-hub-hero panel-surface">
      <div className="portfolio-hub-hero__head">
        <div className="portfolio-hub-hero__value-block">
          <p className="section-label text-pump-muted">Portfolio value</p>
          <div className="portfolio-hub-hero__value-row">
            <p className={`portfolio-hub-hero__value financial-value ${valueFlashClass}`}>
              {displayValue}
            </p>
            <PctChange
              value={portfolioValuePct}
              className="text-caption font-medium"
              toneClassName={pnlTone(portfolioValuePct ?? totalNetPnlUsd)}
            />
          </div>
          <p className={`portfolio-hub-hero__pnl financial-value ${pnlTone(totalNetPnlUsd)} ${pnlFlashClass}`}>
            {formatUsdReadable(totalNetPnlUsd, { compact: true, signed: true, fallback: "$0.00" })}{" "}
            <span className="text-pump-muted font-normal">PnL</span>
          </p>
        </div>
        <div className="portfolio-hub-hero__meta">
          <p className="financial-value text-caption text-pump-muted">{shortAddress(walletAddress)}</p>
          <div className="portfolio-hub-hero__social">
            <button type="button" onClick={onOpenFollowing} className="portfolio-hub-hero__social-link">
              {followingCount} following
            </button>
            <span className="text-pump-muted" aria-hidden>
              ·
            </span>
            <button type="button" onClick={onOpenFollowers} className="portfolio-hub-hero__social-link">
              {followerCount} followers
            </button>
          </div>
        </div>
      </div>

      <div className="portfolio-hub-hero__stats">
        <div className="portfolio-hub-hero__stat">
          <span className="portfolio-hub-hero__stat-label">Positions</span>
          <span className="portfolio-hub-hero__stat-value financial-value">{holdingsCount}</span>
        </div>
        <div className="portfolio-hub-hero__stat">
          <span className="portfolio-hub-hero__stat-label">Unrealized</span>
          <span
            className={`portfolio-hub-hero__stat-value financial-value ${pnlTone(totalUnrealizedPnlUsd)}`}
          >
            {formatUsdReadable(totalUnrealizedPnlUsd, {
              compact: true,
              signed: true,
              fallback: "$0.00",
            })}
          </span>
        </div>
        <div className="portfolio-hub-hero__stat">
          <span className="portfolio-hub-hero__stat-label">Realized</span>
          <span className={`portfolio-hub-hero__stat-value financial-value ${pnlTone(totalRealizedPnlUsd)}`}>
            {formatUsdReadable(totalRealizedPnlUsd, {
              compact: true,
              signed: true,
              fallback: "$0.00",
            })}
          </span>
        </div>
      </div>

      <div className="portfolio-hub-hero__actions">
        <button type="button" onClick={openDeposit} className="primary-button portfolio-hub-hero__action-btn">
          Deposit
        </button>
        <button type="button" onClick={openWithdraw} className="secondary-button portfolio-hub-hero__action-btn">
          Withdraw
        </button>
        <Link href="/trade" className="secondary-button portfolio-hub-hero__action-btn">
          Trade
        </Link>
      </div>
    </section>
  );
}
