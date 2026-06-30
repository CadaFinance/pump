"use client";

import type { TokenDetail } from "@/lib/db/launchpad";
import { PumpSubscriptPrice } from "@/components/ui/PumpSubscriptPrice";
import { FavoriteIcon } from "@/components/icons/FavoriteIcon";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import { TokenSocialLinksBar } from "@/components/token/TokenSocialLinksBar";
import { UserAvatarForAddress } from "@/components/user/UserAvatarForAddress";
import { PumpIcon, faCheck, faChevronDown, faChevronUp, faCopy } from "@/lib/icons";
import { shortAddress } from "@/config/chain";

type TokenMobileHeroProps = {
  token: TokenDetail;
  priceUsd: number | null;
  changePct: number | null;
  volume24hLabel: string;
  fdvLabel: string;
  showSocialLinks: boolean;
  favorited: boolean;
  tradeLocked: boolean;
  copiedAddress: boolean;
  marketSelectorOpen: boolean;
  onOpenMarket: () => void;
  onToggleFavorite: () => void;
  onCopyAddress: () => void;
  onOpenCreator?: (address: string) => void;
  isRefreshing?: boolean;
};

function changeToneClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return "token-mobile-hero__change";
  }
  return value > 0
    ? "token-mobile-hero__change token-mobile-hero__change--up"
    : "token-mobile-hero__change token-mobile-hero__change--down";
}

function formatChangePct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 && pct !== 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function formatHolderCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(1)}K`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(2)}K`;
  return count.toLocaleString();
}

function PriceHero({ priceUsd }: { priceUsd: number | null }) {
  if (priceUsd != null && Number.isFinite(priceUsd) && priceUsd >= 1) {
    return (
      <span className="financial-value">
        $
        {priceUsd.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}
      </span>
    );
  }
  return <PumpSubscriptPrice value={priceUsd} prefix="$" />;
}

function StatCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="token-mobile-hero__stat-cell">
      <span className="token-mobile-hero__stat-label">{label}</span>
      <div className="token-mobile-hero__stat-value">{children}</div>
    </div>
  );
}

/** Mobile token hero — pair selector + always-visible stats grid. */
export function TokenMobileHero({
  token,
  priceUsd,
  changePct,
  volume24hLabel,
  fdvLabel,
  showSocialLinks,
  favorited,
  tradeLocked,
  copiedAddress,
  marketSelectorOpen,
  onOpenMarket,
  onToggleFavorite,
  onCopyAddress,
  onOpenCreator,
  isRefreshing = false,
}: TokenMobileHeroProps) {
  const creatorAddress = token.creatorAddress?.trim() ?? "";

  return (
    <div
      className={`token-mobile-hero panel-surface${isRefreshing ? " token-mobile-hero--refreshing" : ""}`}
    >
      <h1 className="sr-only">
        {token.name} ({token.symbol}/USD)
      </h1>

      <div className="token-mobile-hero__top">
        <button
          type="button"
          className="token-mobile-hero__pair-select"
          onClick={onOpenMarket}
          aria-expanded={marketSelectorOpen}
          aria-controls="token-mobile-market-sheet"
          aria-label="Select token"
        >
          <TokenAvatar
            address={token.address}
            symbol={token.symbol}
            logoUrl={token.logoUrl}
            size={26}
            className="token-mobile-hero__logo shrink-0 !ring-0"
          />
          <span className="token-mobile-hero__symbol financial-value">{token.symbol}/USD</span>
          <PumpIcon
            icon={marketSelectorOpen ? faChevronUp : faChevronDown}
            className="token-mobile-hero__chevron"
          />
        </button>

        <div className="token-mobile-hero__end">
          <div className="token-mobile-hero__quote">
            <div className="token-mobile-hero__price">
              <PriceHero priceUsd={priceUsd} />
            </div>
            <p className={changeToneClass(changePct)}>{formatChangePct(changePct)}</p>
          </div>
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={tradeLocked}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            className={
              favorited
                ? "token-mobile-hero__icon-btn token-mobile-hero__icon-btn--fav-active"
                : "token-mobile-hero__icon-btn"
            }
          >
            <FavoriteIcon active={favorited} className="token-mobile-hero__fav-icon" />
          </button>
        </div>
      </div>

      <div id="token-mobile-hero-stats" className="token-mobile-hero__stats">
        <div className="token-mobile-hero__stats-grid">
          <StatCell label="MCAP">
            <span className="financial-value">{fdvLabel}</span>
          </StatCell>
          <StatCell label="24H Vol.">
            <span className="financial-value">{volume24hLabel}</span>
          </StatCell>
          <StatCell label="Contract">
            <div className="token-mobile-hero__address-row">
              <span className="token-mobile-hero__address financial-value">
                {shortAddress(token.address, true)}
              </span>
              <button
                type="button"
                onClick={onCopyAddress}
                className="token-mobile-hero__copy-btn"
                aria-label={copiedAddress ? "Address copied" : "Copy contract address"}
              >
                {copiedAddress ? (
                  <PumpIcon icon={faCheck} className="h-3 w-3 text-pump-success" />
                ) : (
                  <PumpIcon icon={faCopy} className="h-3 w-3" />
                )}
              </button>
            </div>
          </StatCell>
          <StatCell label="Creator">
            {creatorAddress ? (
              <button
                type="button"
                className="token-mobile-hero__creator-hit financial-value"
                onClick={() => onOpenCreator?.(creatorAddress)}
                disabled={!onOpenCreator}
              >
                <UserAvatarForAddress
                  address={creatorAddress}
                  size={14}
                  className="token-mobile-hero__creator-avatar shrink-0 !ring-0"
                />
                <span className="truncate">{shortAddress(creatorAddress, true)}</span>
              </button>
            ) : (
              <span>—</span>
            )}
          </StatCell>
          <StatCell label="Holders">
            <span className="financial-value">{formatHolderCount(token.holderCount)}</span>
          </StatCell>
          <StatCell label="Links">
            <div className="token-mobile-hero__links-value">
              {showSocialLinks ? (
                <TokenSocialLinksBar links={token.socialLinks} variant="toolbar" />
              ) : (
                <span>—</span>
              )}
            </div>
          </StatCell>
        </div>
      </div>
    </div>
  );
}
