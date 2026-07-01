"use client";

import Link from "next/link";
import { PctChange } from "@/components/ui/PctChange";
import { useWalletFunding } from "@/components/wallet/WalletFundingProvider";
import { NATIVE_SYMBOL } from "@/config/chain";
import { formatPortfolioHoldingValueUsd, formatUsdReadable } from "@/lib/format-usd";
import { PumpIcon, faPen } from "@/lib/icons";
import { UserAvatarForAddress } from "@/components/user/UserAvatarForAddress";

type PortfolioHeroProps = {
  walletAddress: string;
  displayUsername: string;
  canEditProfile: boolean;
  onOpenProfileEditor: () => void;
  onOpenFollowing: () => void;
  onOpenFollowers: () => void;
  followingCount: number;
  followerCount: number;
  totalValueUsd: number | null;
  totalValueNative: number;
  totalNetPnlUsd: number;
  portfolioValuePct: number | null;
  totalUnrealizedPnlUsd: number;
  totalRealizedPnlUsd: number;
  valueFlashClass?: string;
  pnlFlashClass?: string;
};

function pnlTone(value: number): string {
  if (value > 0) return "token-detail-toolbar__stat-value--up";
  if (value < 0) return "token-detail-toolbar__stat-value--down";
  return "";
}

function formatTotalNative(native: number): string {
  if (!Number.isFinite(native) || native <= 0) return `0 ${NATIVE_SYMBOL}`;
  if (native >= 1) {
    return `${native.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${NATIVE_SYMBOL}`;
  }
  if (native >= 0.0001) return `${native.toFixed(4)} ${NATIVE_SYMBOL}`;
  return `${native.toFixed(6)} ${NATIVE_SYMBOL}`;
}

function ToolbarStat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="token-detail-toolbar__stat">
      <span className="token-detail-toolbar__stat-label">{label}</span>
      <div className="token-detail-toolbar__stat-value financial-value">{children}</div>
    </div>
  );
}

export function PortfolioHero({
  walletAddress,
  displayUsername,
  canEditProfile,
  onOpenProfileEditor,
  onOpenFollowing,
  onOpenFollowers,
  followingCount,
  followerCount,
  totalValueUsd,
  totalValueNative,
  totalNetPnlUsd,
  portfolioValuePct,
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

  const pnlPctTone =
    portfolioValuePct != null && portfolioValuePct > 0
      ? "text-pump-success"
      : portfolioValuePct != null && portfolioValuePct < 0
        ? "text-pump-danger"
        : "text-pump-muted";

  return (
    <header className="portfolio-header">
      <div className="portfolio-page-head">
        <h1 className="page-title portfolio-page-head__title">Portfolio</h1>
        <div className="portfolio-toolbar__actions">
          <button
            type="button"
            onClick={openDeposit}
            className="token-toolbar-btn portfolio-toolbar__btn--primary"
          >
            Deposit
          </button>
          <button type="button" onClick={openWithdraw} className="token-toolbar-btn">
            Withdraw
          </button>
          <Link href="/" className="token-toolbar-btn">
            Trade
          </Link>
        </div>
      </div>

      <div className="portfolio-toolbar">
        <div className="token-detail-toolbar">
          <div className="token-detail-toolbar__row portfolio-toolbar__stats-row">
            <div className="token-detail-toolbar__identity">
              <UserAvatarForAddress
                address={walletAddress}
                size={28}
                className="token-detail-toolbar__logo shrink-0 !ring-0"
              />
              <div className="token-detail-toolbar__pair-meta">
                <div className="portfolio-toolbar__name-line">
                  <span className="token-detail-toolbar__symbol financial-value">{displayUsername}</span>
                  {canEditProfile ? (
                    <button
                      type="button"
                      onClick={onOpenProfileEditor}
                      className="portfolio-toolbar__edit-profile"
                      aria-label="Edit profile"
                    >
                      <PumpIcon icon={faPen} className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  ) : null}
                </div>
                <span className="token-detail-toolbar__age portfolio-toolbar__social">
                  <button type="button" onClick={onOpenFollowing} className="portfolio-toolbar__social-link">
                    {followingCount} following
                  </button>
                  <span aria-hidden>·</span>
                  <button type="button" onClick={onOpenFollowers} className="portfolio-toolbar__social-link">
                    {followerCount} followers
                  </button>
                </span>
              </div>
            </div>

            <div className="token-detail-toolbar__scroll portfolio-toolbar__metrics-scroll">
              <div className="portfolio-toolbar__metrics">
                <div className="token-detail-toolbar__stats portfolio-toolbar__metrics-values">
                  <ToolbarStat label="Total Value">
                    <span className={valueFlashClass}>{displayValue}</span>
                  </ToolbarStat>
                  <ToolbarStat label={`${NATIVE_SYMBOL} Value`}>
                    {formatTotalNative(totalValueNative)}
                  </ToolbarStat>
                </div>
                <div className="token-detail-toolbar__stats portfolio-toolbar__metrics-pnl">
                  <div className="token-detail-toolbar__stat">
                    <span className="token-detail-toolbar__stat-label">Est PNL</span>
                    <span
                      className={`token-detail-toolbar__stat-value token-detail-toolbar__price-line financial-value ${pnlTone(totalNetPnlUsd)} ${pnlFlashClass}`}
                    >
                      {formatUsdReadable(totalNetPnlUsd, {
                        compact: true,
                        signed: true,
                        fallback: "$0.00",
                      })}
                      <PctChange value={portfolioValuePct} toneClassName={pnlPctTone} />
                    </span>
                  </div>
                  <ToolbarStat label="Unrealized Pnl">
                    <span className={pnlTone(totalUnrealizedPnlUsd)}>
                      {formatUsdReadable(totalUnrealizedPnlUsd, {
                        compact: true,
                        signed: true,
                        fallback: "$0.00",
                      })}
                    </span>
                  </ToolbarStat>
                  <ToolbarStat label="Realized Pnl">
                    <span className={pnlTone(totalRealizedPnlUsd)}>
                      {formatUsdReadable(totalRealizedPnlUsd, {
                        compact: true,
                        signed: true,
                        fallback: "$0.00",
                      })}
                    </span>
                  </ToolbarStat>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
