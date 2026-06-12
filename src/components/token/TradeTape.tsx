"use client";

import { useEffect, useState } from "react";
import type { TradeItem } from "@/lib/db/launchpad";
import { explorerAddressUrl, explorerTxUrl, shortAddress } from "@/config/chain";
import { UserAvatarForAddress } from "@/components/user/UserAvatarForAddress";
import { DEFAULT_TOKEN_TOTAL_SUPPLY, formatUsdReadable } from "@/lib/format-usd";

type ActivityTab = "holders" | "trades";

type HolderRow = {
  address: string;
  netTokens: number;
  remainingCostBasisBnb: number;
  avgEntryBnb: number | null;
};

const HOLDER_BALANCE_EPSILON = 1e-6;

function tradeNetBnb(trade: TradeItem): number {
  if (trade.netBnb != null) return Number(trade.netBnb);
  const fee = Number(trade.feeBnb ?? 0);
  return Math.max(0, Number(trade.nativeAmount) - fee);
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(4);
  return "0";
}

function formatBnb(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1_000) return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (value >= 1) return value.toFixed(4);
  if (value > 0) return value.toFixed(6);
  return "0";
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSupplyShare(balance: number): string {
  const pct = (balance / DEFAULT_TOKEN_TOTAL_SUPPLY) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return "0%";
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(4)}%`;
}

function buildHolderRowsFromTrades(trades: TradeItem[]): HolderRow[] {
  const byAddress = new Map<string, HolderRow>();
  const orderedTrades = [...trades].sort(
    (a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
  );

  for (const trade of orderedTrades) {
    const key = trade.traderAddress.toLowerCase();
    const current = byAddress.get(key) ?? {
      address: trade.traderAddress,
      netTokens: 0,
      remainingCostBasisBnb: 0,
      avgEntryBnb: null,
    };

    const tokenAmount = Number(trade.tokenAmount);
    const bnbAmount = tradeNetBnb(trade);

    if (trade.side === "BUY") {
      current.netTokens += tokenAmount;
      current.remainingCostBasisBnb += bnbAmount;
    } else {
      const tracked = Math.max(current.netTokens, 0);
      const sold = Math.min(tokenAmount, tracked);
      const avgCost = tracked > 0 ? current.remainingCostBasisBnb / tracked : 0;
      current.netTokens = Math.max(0, tracked - sold);
      current.remainingCostBasisBnb = Math.max(0, current.remainingCostBasisBnb - avgCost * sold);
    }

    if (current.netTokens <= HOLDER_BALANCE_EPSILON) {
      current.netTokens = 0;
      current.remainingCostBasisBnb = 0;
    }

    current.avgEntryBnb =
      current.netTokens > 0 ? current.remainingCostBasisBnb / current.netTokens : null;
    byAddress.set(key, current);
  }

  return [...byAddress.values()]
    .filter((row) => Number.isFinite(row.netTokens) && row.netTokens > HOLDER_BALANCE_EPSILON)
    .sort((a, b) => b.netTokens - a.netTokens);
}

function CreatorBadge() {
  return (
    <span className="shrink-0 rounded-full bg-pump-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pump-accent">
      Creator
    </span>
  );
}

function IdentityPill({
  address,
  showCreatorBadge = false,
}: {
  address: string;
  showCreatorBadge?: boolean;
}) {
  const label = shortAddress(address);
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-0 items-center gap-2 text-pump-text hover:text-pump-accent"
    >
      <UserAvatarForAddress address={address} size={32} />
      <span className="truncate font-medium">{label}</span>
      {showCreatorBadge ? <CreatorBadge /> : null}
    </a>
  );
}

export function TradeTape({
  tokenAddress,
  creatorAddress,
  trades,
  currentPriceBnb,
  bnbUsd,
}: {
  tokenAddress: string;
  creatorAddress: string;
  trades: TradeItem[];
  currentPriceBnb: number;
  bnbUsd: number | null;
}) {
  const creatorKey = creatorAddress.toLowerCase();
  const [tab, setTab] = useState<ActivityTab>("trades");
  const [holderTrades, setHolderTrades] = useState<TradeItem[]>([]);
  const [holderRows, setHolderRows] = useState<HolderRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHolderTrades() {
      try {
        const response = await fetch(`/api/tokens/${tokenAddress}/chart-trades`, {
          cache: "no-store",
        });
        const body = (await response.json()) as { data?: TradeItem[] };
        if (!response.ok || cancelled) return;
        setHolderTrades(body.data ?? []);
      } catch {
        if (!cancelled) setHolderTrades([]);
      }
    }

    void loadHolderTrades();
    const timer = window.setInterval(() => void loadHolderTrades(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tokenAddress]);

  useEffect(() => {
    const byId = new Map<string, TradeItem>();
    for (const trade of holderTrades) byId.set(trade.id, trade);
    for (const trade of trades) {
      if (!byId.has(trade.id)) byId.set(trade.id, trade);
    }
    setHolderRows(buildHolderRowsFromTrades([...byId.values()]));
  }, [holderTrades, trades]);

  return (
    <section className="space-y-3">
      <h2 className="section-heading">Activity</h2>

      <div className="rounded-lg border border-pump-border/15 bg-transparent">
        <div className="flex flex-wrap items-center gap-2 border-b border-pump-border/15 p-3">
          <button
            type="button"
            onClick={() => setTab("trades")}
            className={tab === "trades" ? "chip-button chip-button-active" : "chip-button"}
          >
            Trades
          </button>
          <button
            type="button"
            onClick={() => setTab("holders")}
            className={tab === "holders" ? "chip-button chip-button-active" : "chip-button"}
          >
            Holders
          </button>
        </div>

      {tab === "holders" ? (
          holderRows.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-pump-muted">No holders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-body-sm">
                <thead className="border-b border-pump-border/15 bg-pump-surface/55 text-left">
                  <tr>
                    <th className="section-label px-4 py-3">Account</th>
                    <th className="section-label px-4 py-3">Balance</th>
                    <th className="section-label px-4 py-3">Supply</th>
                    <th className="section-label px-4 py-3">Entry</th>
                    <th className="section-label px-4 py-3 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {holderRows.map((row) => {
                    const avgEntryUsd =
                      row.avgEntryBnb != null && bnbUsd != null ? row.avgEntryBnb * bnbUsd : null;
                    const currentValueUsd =
                      bnbUsd != null ? currentPriceBnb * row.netTokens * bnbUsd : null;
                    const costBasisUsd =
                      bnbUsd != null ? row.remainingCostBasisBnb * bnbUsd : null;
                    const unrealizedPnlUsd =
                      currentValueUsd != null && costBasisUsd != null
                        ? currentValueUsd - costBasisUsd
                        : null;
                    const unrealizedPnlPct =
                      costBasisUsd != null && costBasisUsd > 0
                        ? ((currentValueUsd ?? 0) - costBasisUsd) / costBasisUsd * 100
                        : null;
                    const pnlTone =
                      unrealizedPnlUsd == null
                        ? "text-pump-muted"
                        : unrealizedPnlUsd >= 0
                          ? "text-pump-success"
                          : "text-pump-danger";

                    return (
                      <tr key={row.address} className="border-b border-pump-border/10 last:border-b-0">
                        <td className="px-4 py-3">
                          <IdentityPill
                            address={row.address}
                            showCreatorBadge={row.address.toLowerCase() === creatorKey}
                          />
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatTokenAmount(row.netTokens)}
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatSupplyShare(row.netTokens)}
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatUsdReadable(avgEntryUsd)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <span className={`financial-value text-body-sm font-semibold ${pnlTone}`}>
                              {formatUsdReadable(unrealizedPnlUsd)}
                            </span>
                            <span className={`financial-value text-caption ${pnlTone}`}>
                              {formatPercent(unrealizedPnlPct)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
      ) : trades.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-pump-muted">No trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-body-sm">
                <thead className="border-b border-pump-border/15 bg-pump-surface/55 text-left">
                  <tr>
                    <th className="section-label px-4 py-3">Account</th>
                    <th className="section-label px-4 py-3">Side</th>
                    <th className="section-label px-4 py-3">BNB</th>
                    <th className="section-label px-4 py-3">Tokens</th>
                    <th className="section-label px-4 py-3">Price</th>
                    <th className="section-label px-4 py-3">Time</th>
                    <th className="section-label px-4 py-3 text-right">Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const isBuy = trade.side === "BUY";
                    const isOptimistic = trade.id.startsWith("optimistic:");
                    const tradePriceUsd =
                      bnbUsd != null ? Number(trade.priceBnb) * bnbUsd : null;
                    return (
                      <tr
                        key={trade.id}
                        className={`border-b border-pump-border/10 last:border-b-0 ${
                          isOptimistic ? "bg-pump-accent/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <IdentityPill address={trade.traderAddress} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-caption font-medium ${isBuy ? "text-pump-success" : "text-pump-danger"}`}
                          >
                            {isBuy ? "Buy" : "Sell"}
                          </span>
                          {isOptimistic ? (
                            <span className="ml-2 text-caption text-pump-accent">Live</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatBnb(tradeNetBnb(trade))}
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatTokenAmount(Number(trade.tokenAmount))}
                        </td>
                        <td className="px-4 py-3 financial-value text-pump-text">
                          {formatUsdReadable(tradePriceUsd)}
                        </td>
                        <td className="px-4 py-3 text-caption text-pump-muted">
                          {formatRelativeTime(trade.blockTime)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={explorerTxUrl(trade.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="financial-value text-pump-muted hover:text-pump-accent"
                          >
                            {shortAddress(trade.txHash)}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}
