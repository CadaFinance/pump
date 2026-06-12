"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  CreatorProfile,
  CreatorProfileHolding,
  CreatorProfileToken,
} from "@/lib/db/launchpad";
import { explorerAddressUrl, shortAddress } from "@/config/chain";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import { UserAvatarForAddress } from "@/components/user/UserAvatarForAddress";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import {
  DEFAULT_TOKEN_TOTAL_SUPPLY,
  bnbToUsd,
  formatUsdReadable,
} from "@/lib/format-usd";

type CreatorProfileData = CreatorProfile & {
  bnbBalance: string;
  creatorFeesPendingBnb: number;
  creatorFeesTotalBnb: number;
};

function formatFeeBnb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

type CreatorProfileModalProps = {
  open: boolean;
  onClose: () => void;
  creatorAddress: string;
};

function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(4);
  return "0";
}

function formatSupplyShare(balance: number): string {
  const pct = (balance / DEFAULT_TOKEN_TOTAL_SUPPLY) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "0%";
  if (pct >= 99.95) return "100%";
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(4)}%`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 p-3">
      <p className="section-label">{label}</p>
      <p className="mt-1 financial-value text-body-sm font-semibold text-pump-text">{value}</p>
      {sub ? <p className="mt-0.5 text-caption text-pump-muted">{sub}</p> : null}
    </div>
  );
}

function CreatedTokenRow({
  token,
  bnbUsd,
}: {
  token: CreatorProfileToken;
  bnbUsd: number | null;
}) {
  const balance = Number(token.creatorTokenBalance);
  const mcapUsd = bnbToUsd(Number(token.marketCapBnb), bnbUsd);

  return (
    <tr className="border-b border-pump-border/10 last:border-b-0">
      <td className="px-3 py-2.5">
        <Link href={`/token/${token.address}`} className="flex min-w-0 items-center gap-2.5">
          <TokenAvatar
            address={token.address}
            symbol={token.symbol}
            logoUrl={token.logoUrl}
            size={32}
          />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-pump-text">{token.name}</p>
            <p className="truncate text-caption text-pump-muted">${token.symbol}</p>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5 financial-value text-pump-text">{formatTokenAmount(balance)}</td>
      <td className="px-3 py-2.5 financial-value text-pump-muted">{formatSupplyShare(balance)}</td>
      <td className="px-3 py-2.5 financial-value text-pump-text">
        {formatUsdReadable(mcapUsd, { compact: true })}
      </td>
      <td className="px-3 py-2.5 text-right financial-value text-pump-muted">{token.tradeCount}</td>
    </tr>
  );
}

function HoldingRow({
  holding,
  bnbUsd,
}: {
  holding: CreatorProfileHolding;
  bnbUsd: number | null;
}) {
  const balance = Number(holding.tokenBalance);
  const valueUsd = bnbToUsd(balance * Number(holding.lastPriceBnb), bnbUsd);

  return (
    <tr className="border-b border-pump-border/10 last:border-b-0">
      <td className="px-3 py-2.5">
        <Link
          href={`/token/${holding.tokenAddress}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <TokenAvatar
            address={holding.tokenAddress}
            symbol={holding.symbol}
            logoUrl={holding.logoUrl}
            size={32}
          />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-pump-text">{holding.name}</p>
            <p className="truncate text-caption text-pump-muted">${holding.symbol}</p>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5 financial-value text-pump-text">{formatTokenAmount(balance)}</td>
      <td className="px-3 py-2.5 financial-value text-pump-text">
        {formatUsdReadable(valueUsd, { compact: true })}
      </td>
    </tr>
  );
}

export function CreatorProfileModal({ open, onClose, creatorAddress }: CreatorProfileModalProps) {
  const { bnbUsd } = useBnbUsdPrice();
  const [profile, setProfile] = useState<CreatorProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !creatorAddress) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);

    void (async () => {
      try {
        const response = await fetch(
          `/api/creators/${encodeURIComponent(creatorAddress)}/profile`,
          { cache: "no-store" }
        );
        const body = (await response.json()) as { data?: CreatorProfileData; error?: string };
        if (cancelled) return;
        if (!response.ok || !body.data) {
          throw new Error(body.error ?? "Failed to load creator profile");
        }
        setProfile(body.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load creator profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, creatorAddress]);

  if (!open) return null;

  const bnbBalance = profile ? Number(profile.bnbBalance) : 0;
  const walletBnbLabel =
    bnbBalance >= 1
      ? bnbBalance.toFixed(4)
      : bnbBalance >= 0.0001
        ? bnbBalance.toFixed(6)
        : bnbBalance.toFixed(8);
  const walletUsdLabel = formatUsdReadable(bnbToUsd(bnbBalance, bnbUsd));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="panel-surface relative w-full max-w-2xl p-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatarForAddress address={creatorAddress} size={48} />
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="creator-profile-title"
                className="financial-value text-h2 font-semibold text-pump-text"
              >
                {shortAddress(creatorAddress)}
              </h2>
              <span className="rounded-full bg-pump-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pump-accent">
                Creator
              </span>
            </div>
            <a
              href={explorerAddressUrl(creatorAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-caption text-pump-muted hover:text-pump-accent hover:underline"
            >
              View on BscScan
            </a>
            </div>
          </div>
          <button type="button" onClick={onClose} className="secondary-button shrink-0 px-3 py-1.5 text-body-sm">
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-md bg-pump-surface/60"
                />
              ))}
            </div>
            <div className="h-32 animate-pulse rounded-md bg-pump-surface/60" />
          </div>
        ) : error ? (
          <p className="notice-error mt-6 p-4 text-body-sm">{error}</p>
        ) : profile ? (
          <div className="mt-5 space-y-5">
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Wallet BNB"
                value={`${walletBnbLabel} BNB`}
                sub={walletUsdLabel !== "—" ? walletUsdLabel : undefined}
              />
              <StatCard
                label="Tokens launched"
                value={String(profile.createdTokens.length)}
              />
              <StatCard
                label="Followers"
                value={profile.followerCount.toLocaleString()}
              />
              <StatCard
                label="Trading volume"
                value={formatUsdReadable(bnbToUsd(profile.totalVolumeBnb, bnbUsd), {
                  compact: true,
                })}
                sub={`${profile.totalVolumeBnb.toFixed(4)} BNB`}
              />
            </section>

            {profile.creatorFeesTotalBnb > 0 || profile.createdTokens.length > 0 ? (
              <div className="rounded-md border border-pump-border/15 bg-pump-surface/30 px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-body-sm text-pump-muted">Total creator fees</span>
                  <span className="financial-value text-body font-semibold text-pump-text">
                    {formatFeeBnb(profile.creatorFeesTotalBnb)} BNB
                  </span>
                </div>
              </div>
            ) : null}

            <section>
              <h3 className="section-heading">Launched tokens</h3>
              {profile.createdTokens.length === 0 ? (
                <p className="mt-2 text-body-sm text-pump-muted">No launched tokens yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-pump-border/15">
                  <table className="min-w-[520px] w-full text-body-sm">
                    <thead className="border-b border-pump-border/15 bg-pump-surface/55 text-left">
                      <tr>
                        <th className="section-label px-3 py-2.5">Coin</th>
                        <th className="section-label px-3 py-2.5">Creator holds</th>
                        <th className="section-label px-3 py-2.5">Supply</th>
                        <th className="section-label px-3 py-2.5">Mcap</th>
                        <th className="section-label px-3 py-2.5 text-right">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.createdTokens.map((token) => (
                        <CreatedTokenRow key={token.address} token={token} bnbUsd={bnbUsd} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {profile.otherHoldings.length > 0 ? (
              <section>
                <h3 className="section-heading">Other holdings</h3>
                <p className="mt-1 text-caption text-pump-muted">
                  Tokens launched by others held in this wallet.
                </p>
                <div className="mt-3 overflow-x-auto rounded-lg border border-pump-border/15">
                  <table className="min-w-[400px] w-full text-body-sm">
                    <thead className="border-b border-pump-border/15 bg-pump-surface/55 text-left">
                      <tr>
                        <th className="section-label px-3 py-2.5">Coin</th>
                        <th className="section-label px-3 py-2.5">Balance</th>
                        <th className="section-label px-3 py-2.5">Est. value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.otherHoldings.map((holding) => (
                        <HoldingRow key={holding.tokenAddress} holding={holding} bnbUsd={bnbUsd} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
