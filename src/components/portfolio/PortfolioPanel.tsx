"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { formatEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { contracts, pumpChain } from "@/config/chain";
import { bondingCurveManagerAbi } from "@/lib/bonding-curve";
import { ClaimCreatorFeesModal } from "@/components/portfolio/ClaimCreatorFeesModal";
import { FollowNetworkModal } from "@/components/portfolio/FollowNetworkModal";
import { AvatarPickerModal } from "@/components/user/AvatarPickerModal";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useUserAvatar } from "@/components/user/UserAvatarProvider";
import { shortAddress } from "@/config/chain";
import { TokenBoardTable } from "@/components/arena/TokenBoardTable";
import { PortfolioPanelSkeleton } from "@/components/portfolio/PortfolioPanelSkeleton";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import type { TokenListItem } from "@/lib/db/launchpad";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { bnbToUsd, formatUsdReadable } from "@/lib/format-usd";
import { formatCapForBoard, formatSignedPct, pctTone } from "@/lib/arena-board-format";

type PortfolioPosition = {
  tokenAddress: string;
  symbol: string;
  name: string;
  logoUrl: string | null;
  tokenBalance: string;
  totalBoughtBnb: string;
  totalSoldBnb: string;
  realizedPnlBnb: string;
  lastPriceBnb: string;
  estimatedValueBnb: number;
};

type PortfolioData = {
  address: string;
  totalVolumeBnb: number;
  buyVolumeBnb: number;
  sellVolumeBnb: number;
  lastTradeAt: string | null;
  creatorFeesClaimedBnb: number;
  followingCount: number;
  followerCount: number;
  positions: PortfolioPosition[];
  createdTokens: TokenListItem[];
};

type TradeRow = {
  id: string;
  side: string;
  traderAddress: string;
  nativeAmount: string;
  feeBnb?: string;
  netBnb?: string;
  tokenAmount: string;
  priceBnb: string;
  txHash: string;
  blockTime: string;
};

type DerivedLot = {
  netTokens: number;
  remainingCostBnb: number;
};

function formatFeeBnb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

function formatSignedBnb(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(4)} BNB`;
}

function pnlTone(value: number): string {
  if (value > 0) return "text-pump-success";
  if (value < 0) return "text-pump-danger";
  return "text-pump-text";
}

function formatTokenBalance(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function PortfolioStatBox({
  label,
  value,
  sub,
  valueClassName = "financial-value text-body-sm font-semibold text-pump-text",
  className = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <p className="section-label text-[10px] md:hidden">{label}</p>
      <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-2 md:px-3 md:py-2.5">
        <span className="section-label hidden shrink-0 whitespace-nowrap md:inline">{label}</span>
        <div className="min-w-0 md:text-right">
          <p className={valueClassName}>{value}</p>
          {sub ? <p className="mt-0.5 text-caption text-pump-muted">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PnlCell({ usd, pct }: { usd: number | null; pct: number | null }) {
  const tone = pct != null && Number.isFinite(pct) ? pnlTone(pct) : "text-pump-muted";
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <span className={`financial-value text-body-sm font-semibold ${tone}`}>
        {formatUsdReadable(usd, { compact: true, signed: true })}
      </span>
      <span className={`financial-value text-caption font-medium ${tone}`}>
        {formatSignedPct(pct)}
      </span>
    </div>
  );
}

const BURST_POLL_MS = 1_500;
const BURST_DURATION_MS = 60_000;
const NORMAL_POLL_MS = 15_000;

function tradeNetBnb(trade: TradeRow): number {
  if (trade.netBnb != null) return Math.max(0, Number(trade.netBnb));
  const gross = Number(trade.nativeAmount);
  const fee = Number(trade.feeBnb ?? 0);
  return Math.max(0, gross - fee);
}

function computeOpenLotForAddress(trades: TradeRow[], walletAddress: string): DerivedLot {
  const target = walletAddress.toLowerCase();
  const ordered = [...trades].sort(
    (a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
  );

  let netTokens = 0;
  let remainingCostBnb = 0;

  for (const trade of ordered) {
    if (trade.traderAddress.toLowerCase() !== target) continue;

    const tokenAmount = Number(trade.tokenAmount);
    const bnbAmount = tradeNetBnb(trade);

    if (trade.side === "BUY") {
      netTokens += tokenAmount;
      remainingCostBnb += bnbAmount;
    } else {
      const tracked = Math.max(netTokens, 0);
      const sold = Math.min(tokenAmount, tracked);
      const avgCost = tracked > 0 ? remainingCostBnb / tracked : 0;
      netTokens = Math.max(0, tracked - sold);
      remainingCostBnb = Math.max(0, remainingCostBnb - avgCost * sold);
    }
  }

  return { netTokens, remainingCostBnb };
}

export function PortfolioPanel() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { bnbUsd } = useBnbUsdPrice();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<"following" | "followers">("following");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const { avatarId } = useUserAvatar();
  const [derivedLots, setDerivedLots] = useState<Record<string, DerivedLot>>({});
  const burstUntilRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: pendingWei, refetch: refetchPending } = useReadContract({
    address: contracts.bondingCurveManager,
    abi: bondingCurveManagerAbi,
    functionName: "pendingCreatorFees",
    args: address ? [address] : undefined,
    chainId: pumpChain.id,
    query: { enabled: Boolean(address && isConnected) },
  });

  const loadPortfolio = useCallback(async (walletAddress: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/portfolio?address=${walletAddress}`);
      const body = (await response.json()) as { data?: PortfolioData; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load portfolio");
      }

      setData(body.data ?? null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setData(null);
    setLoading(true);
    void loadPortfolio(address);
  }, [address, isConnected, loadPortfolio]);

  useEffect(() => {
    const positions = data?.positions ?? [];
    if (!address || positions.length === 0) {
      setDerivedLots({});
      return;
    }

    const wallet = address;
    let cancelled = false;

    async function loadDerivedLots() {
      const entries = await Promise.all(
        positions.map(async (position) => {
          try {
            const response = await fetch(`/api/tokens/${position.tokenAddress}/chart-trades`, {
              cache: "no-store",
            });
            const body = (await response.json()) as { data?: TradeRow[] };
            if (!response.ok) return [position.tokenAddress, null] as const;
            const lot = computeOpenLotForAddress(body.data ?? [], wallet);
            return [position.tokenAddress, lot] as const;
          } catch {
            return [position.tokenAddress, null] as const;
          }
        })
      );

      if (cancelled) return;
      const next: Record<string, DerivedLot> = {};
      for (const [tokenAddress, lot] of entries) {
        if (lot && lot.netTokens > 0) next[tokenAddress] = lot;
      }
      setDerivedLots(next);
    }

    void loadDerivedLots();
    const timer = setInterval(() => void loadDerivedLots(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address, data?.positions]);

  const schedulePoll = useCallback(() => {
    if (!address) return;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    const delay = Date.now() < burstUntilRef.current ? BURST_POLL_MS : NORMAL_POLL_MS;
    pollTimerRef.current = setTimeout(async () => {
      await loadPortfolio(address);
      schedulePoll();
    }, delay);
  }, [address, loadPortfolio]);

  useEffect(() => {
    if (!isConnected || !address) return;

    const onActivity = () => {
      burstUntilRef.current = Date.now() + BURST_DURATION_MS;
      void loadPortfolio(address);
      schedulePoll();
    };

    window.addEventListener("pump:activity", onActivity);
    schedulePoll();

    return () => {
      window.removeEventListener("pump:activity", onActivity);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [address, isConnected, loadPortfolio, schedulePoll]);

  if (!isConnected || !address) {
    return (
      <div className="panel-surface p-8 text-center">
        <p className="text-body-sm text-pump-muted">
          Connect your wallet to view holdings, creator fees, and launched tokens.
        </p>
        <button
          type="button"
          onClick={() => openConnectModal?.()}
          className="primary-button mt-4 px-6"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return <PortfolioPanelSkeleton />;
  }

  const totalEstimated = data?.positions.reduce((sum, p) => sum + p.estimatedValueBnb, 0) ?? 0;
  const totalNetPnl =
    data?.positions.reduce((sum, p) => {
      const lot = derivedLots[p.tokenAddress];
      const balance = lot?.netTokens ?? Number(p.tokenBalance);
      const remainingCost = lot?.remainingCostBnb ?? Math.max(0, Number(p.totalBoughtBnb) - Number(p.totalSoldBnb));
      const openValue = balance * Number(p.lastPriceBnb);
      return sum + (openValue - remainingCost);
    }, 0) ?? 0;
  const totalEstimatedUsd = bnbToUsd(totalEstimated, bnbUsd);
  const totalNetPnlUsd =
    bnbUsd != null && Number.isFinite(totalNetPnl) ? totalNetPnl * bnbUsd : null;
  const claimedBnb = data?.creatorFeesClaimedBnb ?? 0;
  const pendingBnb = pendingWei != null ? Number(formatEther(pendingWei)) : 0;
  const creatorFeesTotalBnb = claimedBnb + pendingBnb;
  const creatorFeesTotalUsd = bnbToUsd(creatorFeesTotalBnb, bnbUsd);
  const showCreatorFees =
    creatorFeesTotalBnb > 0 || pendingBnb > 0 || (data?.createdTokens.length ?? 0) > 0;

  return (
    <>
      <ClaimCreatorFeesModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        claimedBnb={claimedBnb}
        onClaimed={() => {
          void refetchPending();
          if (address) void loadPortfolio(address);
        }}
      />

      <FollowNetworkModal
        open={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        address={address}
        initialTab={followModalTab}
      />

      <AvatarPickerModal open={avatarPickerOpen} onClose={() => setAvatarPickerOpen(false)} />

      <div className="space-y-3 md:space-y-4">
        <section className="rounded-lg border border-pump-accent/25 bg-gradient-to-br from-pump-accent/12 via-pump-card/70 to-pump-surface/55 p-3 md:p-4">
          <div className="flex items-center gap-3">
            {avatarId ? (
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(true)}
                className="shrink-0 rounded-full transition hover:opacity-90"
                aria-label="Change avatar"
              >
                <UserAvatar address={address} avatarId={avatarId} size={48} />
              </button>
            ) : (
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-pump-surface/60 md:h-14 md:w-14" />
            )}
            <div className="min-w-0 flex-1">
              <p className="financial-value text-body-sm font-semibold text-pump-text md:text-body">
                {shortAddress(address)}
              </p>
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(true)}
                className="mt-0.5 text-caption font-medium text-pump-accent hover:underline"
              >
                Change avatar
              </button>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption md:mt-2 md:text-body-sm">
                <button
                  type="button"
                  onClick={() => {
                    setFollowModalTab("following");
                    setFollowModalOpen(true);
                  }}
                  className="financial-value font-semibold text-pump-text transition hover:text-pump-accent"
                >
                  {data?.followingCount ?? 0} following
                </button>
                <span className="text-pump-muted">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setFollowModalTab("followers");
                    setFollowModalOpen(true);
                  }}
                  className="financial-value font-semibold text-pump-text transition hover:text-pump-accent"
                >
                  {data?.followerCount ?? 0} followers
                </button>
              </div>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-4 md:gap-2">
            <PortfolioStatBox
              label="Portfolio value"
              value={formatUsdReadable(totalEstimatedUsd, { compact: true })}
              sub={`${totalEstimated.toFixed(4)} BNB`}
            />
            <PortfolioStatBox
              label="Net PnL"
              value={formatUsdReadable(totalNetPnlUsd, { compact: true, signed: true })}
              sub={<span className={pnlTone(totalNetPnl)}>{formatSignedBnb(totalNetPnl)}</span>}
              valueClassName={`financial-value text-body-sm font-semibold ${pnlTone(totalNetPnl)}`}
            />
            {showCreatorFees ? (
              <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-2">
                <p className="section-label text-[10px] md:hidden">Creator fees</p>
                <div className="rounded-md border border-pump-border/15 bg-pump-surface/35 p-2.5 md:flex md:items-center md:justify-between md:gap-3 md:p-3">
                  <div className="min-w-0 md:flex md:flex-1 md:items-center md:justify-between md:gap-3">
                    <span className="section-label hidden shrink-0 md:inline">Creator fees</span>
                    <div className="min-w-0">
                      <p className="financial-value text-body-sm font-semibold text-pump-text">
                        {formatUsdReadable(creatorFeesTotalUsd, { compact: true })}
                      </p>
                      <p className="mt-0.5 text-caption text-pump-muted">
                        {formatFeeBnb(creatorFeesTotalBnb)} BNB · {formatFeeBnb(claimedBnb)} claimed ·{" "}
                        {formatFeeBnb(pendingBnb)} pending
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClaimOpen(true)}
                    className="chip-button chip-button-active mt-2 w-full shrink-0 md:mt-0 md:w-auto"
                  >
                    Claim fees
                  </button>
                </div>
              </div>
            ) : null}
          </dl>
        </section>

        {error ? <div className="notice-error p-4">{error}</div> : null}

        {data && !error ? (
          <>
            <div className="space-y-2 md:space-y-3">
              <h3 className="section-heading text-h3">Holdings ({data.positions.length})</h3>
              {data.positions.length === 0 ? (
                <p className="panel-surface p-6 text-center text-body-sm text-pump-muted">
                  No open positions. Buy from the Arena.
                </p>
              ) : (
                <section className="rounded-lg border border-pump-border/15 bg-transparent">
                  <div className="lg:hidden divide-y divide-pump-border/10">
                    {data.positions.map((position) => {
                      const totalBought = Number(position.totalBoughtBnb);
                      const totalSold = Number(position.totalSoldBnb);
                      const lot = derivedLots[position.tokenAddress];
                      const balance = lot?.netTokens ?? Number(position.tokenBalance);
                      const remainingCostBasis =
                        lot?.remainingCostBnb ?? Math.max(0, totalBought - totalSold);
                      const avgEntry = balance > 0 ? remainingCostBasis / balance : null;
                      const avgEntryUsd = avgEntry != null ? bnbToUsd(avgEntry, bnbUsd) : null;
                      const positionValueUsd = bnbToUsd(
                        balance * Number(position.lastPriceBnb),
                        bnbUsd
                      );
                      const netPnl = balance * Number(position.lastPriceBnb) - remainingCostBasis;
                      const netPnlUsd = bnbUsd != null ? netPnl * bnbUsd : null;
                      const netPnlPct =
                        remainingCostBasis > 0 ? (netPnl / remainingCostBasis) * 100 : null;

                      return (
                        <article
                          key={position.tokenAddress}
                          className="grid grid-cols-[1.75rem_1fr_auto] gap-x-2 gap-y-2 p-2.5"
                        >
                          <TokenAvatar
                            address={position.tokenAddress}
                            symbol={position.symbol}
                            logoUrl={position.logoUrl}
                            size={28}
                            className="row-span-2 self-start"
                          />
                          <Link
                            href={`/token/${position.tokenAddress}`}
                            className="self-center truncate text-body-sm font-medium text-pump-text"
                          >
                            ${position.symbol}
                          </Link>
                          <div className="self-center">
                            <PnlCell usd={netPnlUsd} pct={netPnlPct} />
                          </div>
                          <div className="col-span-2 col-start-2 flex w-full items-center justify-between gap-2 text-[11px] leading-tight">
                            <span className="financial-value min-w-0 truncate text-pump-text">
                              <span className="text-pump-muted">VAL </span>
                              {formatUsdReadable(positionValueUsd, { compact: true })}
                            </span>
                            <span className="financial-value min-w-0 truncate text-pump-text">
                              <span className="text-pump-muted">BAL </span>
                              {formatTokenBalance(balance)}
                            </span>
                            <span className="financial-value min-w-0 truncate text-right text-pump-text">
                              <span className="text-pump-muted">ENTRY </span>
                              {formatUsdReadable(avgEntryUsd, { compact: true })}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-[820px] w-full text-body-sm">
                      <thead className="border-b border-pump-border/15 bg-pump-surface/55 text-left">
                        <tr>
                          <th className="section-label px-4 py-3">Coin</th>
                          <th className="section-label px-4 py-3">Value</th>
                          <th className="section-label px-4 py-3">Balance</th>
                          <th className="section-label px-4 py-3">Entry</th>
                          <th className="section-label px-4 py-3 text-right">Net PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.positions.map((position) => {
                          const totalBought = Number(position.totalBoughtBnb);
                          const totalSold = Number(position.totalSoldBnb);
                          const lot = derivedLots[position.tokenAddress];
                          const balance = lot?.netTokens ?? Number(position.tokenBalance);
                          const remainingCostBasis =
                            lot?.remainingCostBnb ?? Math.max(0, totalBought - totalSold);
                          const avgEntry = balance > 0 ? remainingCostBasis / balance : null;
                          const avgEntryUsd = avgEntry != null ? bnbToUsd(avgEntry, bnbUsd) : null;
                          const positionValueUsd = bnbToUsd(
                            balance * Number(position.lastPriceBnb),
                            bnbUsd
                          );
                          const netPnl =
                            balance * Number(position.lastPriceBnb) - remainingCostBasis;
                          const netPnlUsd = bnbUsd != null ? netPnl * bnbUsd : null;
                          const netPnlPct =
                            remainingCostBasis > 0 ? (netPnl / remainingCostBasis) * 100 : null;

                          return (
                            <tr
                              key={position.tokenAddress}
                              className="border-b border-pump-border/10 last:border-b-0"
                            >
                              <td className="px-4 py-3">
                                <Link
                                  href={`/token/${position.tokenAddress}`}
                                  className="flex min-w-0 items-center gap-3"
                                >
                                  <TokenAvatar
                                    address={position.tokenAddress}
                                    symbol={position.symbol}
                                    logoUrl={position.logoUrl}
                                    size={30}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-body-sm font-medium text-pump-text">
                                      {position.name}
                                    </p>
                                    <p className="truncate text-caption text-pump-muted">
                                      ${position.symbol}
                                    </p>
                                  </div>
                                </Link>
                              </td>
                              <td className="px-4 py-3 financial-value font-semibold text-pump-text">
                                {formatUsdReadable(positionValueUsd, { compact: true })}
                              </td>
                              <td className="px-4 py-3 financial-value text-pump-text">
                                {formatTokenBalance(balance)}
                              </td>
                              <td className="px-4 py-3 financial-value text-pump-text">
                                {formatUsdReadable(avgEntryUsd, { compact: true })}
                              </td>
                              <td className="px-4 py-3">
                                <PnlCell usd={netPnlUsd} pct={netPnlPct} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-2 md:space-y-3">
              <h3 className="section-heading text-h3">
                Created ({data.createdTokens.length})
              </h3>
              {data.createdTokens.length === 0 ? (
                <p className="panel-surface p-6 text-center text-body-sm text-pump-muted">
                  No launched tokens yet.{" "}
                  <Link href="/create" className="text-pump-accent hover:underline">
                    Create one
                  </Link>
                </p>
              ) : (
                <section className="rounded-lg border border-pump-border/15 bg-transparent">
                  <div className="lg:hidden divide-y divide-pump-border/10">
                    {data.createdTokens.map((token) => {
                      const mcapUsd = bnbToUsd(Number(token.marketCapBnb), bnbUsd);
                      const vol24hUsd = bnbToUsd(Number(token.volume24hBnb ?? 0), bnbUsd);
                      return (
                        <article
                          key={token.address}
                          className="grid grid-cols-[1.75rem_1fr] gap-x-2 gap-y-2 p-2.5"
                        >
                          <TokenAvatar
                            address={token.address}
                            symbol={token.symbol}
                            logoUrl={token.logoUrl}
                            size={28}
                            className="row-span-2 self-start"
                          />
                          <Link
                            href={`/token/${token.address}`}
                            className="self-center truncate text-body-sm font-medium text-pump-text"
                          >
                            ${token.symbol}
                          </Link>
                          <div className="col-start-2 flex w-full items-center justify-between gap-1 text-[11px] leading-tight">
                            <span className="financial-value min-w-0 truncate text-pump-text">
                              <span className="text-pump-muted">MCAP </span>
                              {formatCapForBoard(mcapUsd)}
                            </span>
                            <span className="financial-value min-w-0 truncate text-pump-text">
                              <span className="text-pump-muted">TXN </span>
                              {token.tradeCount ?? 0}
                            </span>
                            <span className="financial-value min-w-0 truncate text-pump-text">
                              <span className="text-pump-muted">VOL </span>
                              {formatUsdReadable(vol24hUsd, { compact: true })}
                            </span>
                            <span
                              className={`financial-value shrink-0 text-right ${pctTone(token.change24hPct ?? null)}`}
                            >
                              <span className="text-pump-muted">24H </span>
                              {formatSignedPct(token.change24hPct ?? null)}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="hidden lg:block">
                    <TokenBoardTable tokens={data.createdTokens} bnbUsd={bnbUsd} variant="created" />
                  </div>
                </section>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
