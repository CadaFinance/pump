"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TokenHolderSnapshot, TradeItem } from "@/lib/db/launchpad";
import { explorerTxUrl, shortAddress } from "@/config/chain";
import { UserAvatarForAddress } from "@/components/user/UserAvatarForAddress";
import { PctChange } from "@/components/ui/PctChange";
import { ACTIVITY_PAGE_SIZE } from "@/lib/activity-page-size";
import { DEFAULT_TOKEN_TOTAL_SUPPLY, formatUsdReadable, formatTradeFillPriceUsd, tradeNetUsdForDisplay, positionAvgEntryUsd, positionUnrealizedUsd, positionUnrealizedPct, scaleCostBasisUsdForBalance } from "@/lib/format-usd";
import {
  resolveVerifiedTokenBalance,
  scaleCostBasisForBalance,
} from "@/lib/onchain-balance";
import { useLiveTradeAnimations } from "@/hooks/useLiveTradeAnimations";
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel";

type ActivityTab = "holders" | "trades";

type HolderRow = {
  address: string;
  netTokens: number;
  remainingCostBasisBnb: number;
  remainingCostBasisUsd: number;
  avgEntryBnb: number | null;
};

type PagedMeta = {
  hasMore: boolean;
  offset: number;
};

const activityTableScrollClass = "token-tape-table-wrap";

function formatTradeClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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
  if (pct >= 0.01) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(4)}%`;
}

function mergeTradesByTxHash(...groups: TradeItem[][]): TradeItem[] {
  const seen = new Set<string>();
  const merged: TradeItem[] = [];
  for (const group of groups) {
    for (const trade of group) {
      const key = trade.txHash.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(trade);
    }
  }
  return merged.sort(
    (a, b) => new Date(b.blockTime).getTime() - new Date(a.blockTime).getTime()
  );
}

function mapApiHoldersToRows(holders: TokenHolderSnapshot[]): HolderRow[] {
  return holders
    .map((holder) => {
      const indexedBalance = Number(holder.tokenBalance);
      const onChainBalance =
        holder.onChainBalance != null ? Number(holder.onChainBalance) : undefined;
      const { displayBalance, hidden } = resolveVerifiedTokenBalance(
        indexedBalance,
        onChainBalance
      );
      if (hidden) return null;

      const fullCostBasis = Math.max(0, Number(holder.remainingCostBasisBnb));
      const fullCostBasisUsd = Math.max(0, Number(holder.remainingCostBasisUsd ?? 0));
      const remainingCostBasisBnb = scaleCostBasisForBalance(
        fullCostBasis,
        indexedBalance,
        displayBalance
      );
      const remainingCostBasisUsd = scaleCostBasisUsdForBalance(
        fullCostBasisUsd,
        indexedBalance,
        displayBalance
      );

      return {
        address: holder.address,
        netTokens: displayBalance,
        remainingCostBasisBnb,
        remainingCostBasisUsd,
        avgEntryBnb:
          displayBalance > 0 ? remainingCostBasisBnb / displayBalance : null,
      };
    })
    .filter((row): row is HolderRow => row != null)
    .sort((a, b) => b.netTokens - a.netTokens);
}

function mergeHolderRows(existing: HolderRow[], incoming: HolderRow[]): HolderRow[] {
  const byAddress = new Map<string, HolderRow>();
  for (const row of existing) {
    byAddress.set(row.address.toLowerCase(), row);
  }
  for (const row of incoming) {
    byAddress.set(row.address.toLowerCase(), row);
  }
  return [...byAddress.values()].sort((a, b) => b.netTokens - a.netTokens);
}

function CreatorBadge() {
  return (
    <span className="shrink-0 rounded-full bg-pump-accent/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-pump-accent">
      Creator
    </span>
  );
}

function IdentityPill({
  address,
  showCreatorBadge = false,
  onAddressClick,
}: {
  address: string;
  showCreatorBadge?: boolean;
  onAddressClick: (address: string) => void;
}) {
  const label = shortAddress(address, true);
  return (
    <button
      type="button"
      onClick={() => onAddressClick(address)}
      className="token-tape-identity"
      aria-label={`View profile ${label}`}
    >
      <UserAvatarForAddress address={address} size={18} className="shrink-0" />
      <span className="token-tape-identity__label">{label}</span>
      {showCreatorBadge ? <CreatorBadge /> : null}
    </button>
  );
}

function LoadMoreSentinel({
  loading,
  label,
}: {
  loading: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-center py-3 text-caption text-pump-muted">
      {loading ? label : null}
    </div>
  );
}

export function TradeTape({
  tokenAddress,
  creatorAddress,
  symbol,
  headTrades,
  wsConnected = false,
  holdersRefreshKey = 0,
  initialHolders,
  currentPriceBnb,
  bnbUsd,
  onAddressClick,
}: {
  tokenAddress: string;
  creatorAddress: string;
  symbol: string;
  /** Latest trades from live poll + optimistic layer (tape head). */
  headTrades: TradeItem[];
  wsConnected?: boolean;
  holdersRefreshKey?: number;
  initialHolders?: TokenHolderSnapshot[];
  currentPriceBnb: number;
  bnbUsd: number | null;
  onAddressClick: (address: string) => void;
}) {
  const creatorKey = creatorAddress.toLowerCase();
  const [tab, setTab] = useState<ActivityTab>("trades");

  const [olderTrades, setOlderTrades] = useState<TradeItem[]>([]);
  const [tradeOffset, setTradeOffset] = useState(ACTIVITY_PAGE_SIZE);
  const [hasMoreTrades, setHasMoreTrades] = useState(headTrades.length >= ACTIVITY_PAGE_SIZE);
  const [loadingMoreTrades, setLoadingMoreTrades] = useState(false);

  const [holderRows, setHolderRows] = useState<HolderRow[]>(() =>
    initialHolders?.length ? mapApiHoldersToRows(initialHolders) : []
  );
  const [holderOffset, setHolderOffset] = useState(
    initialHolders?.length ? initialHolders.length : ACTIVITY_PAGE_SIZE
  );
  const [hasMoreHolders, setHasMoreHolders] = useState(
    Boolean(initialHolders && initialHolders.length >= ACTIVITY_PAGE_SIZE)
  );
  const [loadingMoreHolders, setLoadingMoreHolders] = useState(false);
  const [holdersReady, setHoldersReady] = useState(
    Boolean(initialHolders && initialHolders.length > 0)
  );

  const displayedTrades = useMemo(
    () => mergeTradesByTxHash(headTrades, olderTrades),
    [headTrades, olderTrades]
  );

  const tradeIds = useMemo(() => displayedTrades.map((t) => t.id), [displayedTrades]);
  const { rowClass: tradeRowClass } = useLiveTradeAnimations(tradeIds);

  const loadMoreTrades = useCallback(async () => {
    if (loadingMoreTrades || !hasMoreTrades) return;
    setLoadingMoreTrades(true);
    try {
      const response = await fetch(
        `/api/tokens/${tokenAddress}/trades?limit=${ACTIVITY_PAGE_SIZE}&offset=${tradeOffset}`,
        { cache: "no-store" }
      );
      const body = (await response.json()) as {
        data?: TradeItem[];
        meta?: PagedMeta;
      };
      if (!response.ok) return;
      const next = body.data ?? [];
      setOlderTrades((prev) => mergeTradesByTxHash(prev, next));
      setTradeOffset((prev) => prev + next.length);
      setHasMoreTrades(body.meta?.hasMore ?? next.length >= ACTIVITY_PAGE_SIZE);
    } finally {
      setLoadingMoreTrades(false);
    }
  }, [hasMoreTrades, loadingMoreTrades, tokenAddress, tradeOffset]);

  const fetchHoldersPage = useCallback(
    async (offset: number, append: boolean) => {
      const response = await fetch(
        `/api/tokens/${tokenAddress}/holders?limit=${ACTIVITY_PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" }
      );
      const body = (await response.json()) as {
        data?: TokenHolderSnapshot[];
        meta?: PagedMeta;
      };
      if (!response.ok) return null;
      const rows = mapApiHoldersToRows(body.data ?? []);
      setHolderRows((prev) => {
        if (append) return mergeHolderRows(prev, rows);
        if (offset === 0 && prev.length > ACTIVITY_PAGE_SIZE) {
          return mergeHolderRows(rows, prev.slice(ACTIVITY_PAGE_SIZE));
        }
        return rows;
      });
      setHolderOffset(offset + rows.length);
      setHasMoreHolders(body.meta?.hasMore ?? rows.length >= ACTIVITY_PAGE_SIZE);
      setHoldersReady(true);
      return rows;
    },
    [tokenAddress]
  );

  const loadMoreHolders = useCallback(async () => {
    if (loadingMoreHolders || !hasMoreHolders) return;
    setLoadingMoreHolders(true);
    try {
      await fetchHoldersPage(holderOffset, true);
    } finally {
      setLoadingMoreHolders(false);
    }
  }, [fetchHoldersPage, hasMoreHolders, holderOffset, loadingMoreHolders]);

  const tradeSentinelRef = useInfiniteScrollSentinel({
    enabled: tab === "trades",
    hasMore: hasMoreTrades,
    loading: loadingMoreTrades,
    onLoadMore: loadMoreTrades,
  });

  const holderSentinelRef = useInfiniteScrollSentinel({
    enabled: tab === "holders",
    hasMore: hasMoreHolders,
    loading: loadingMoreHolders,
    onLoadMore: loadMoreHolders,
  });

  useEffect(() => {
    if (initialHolders?.length) {
      setHolderRows(mapApiHoldersToRows(initialHolders));
      setHolderOffset(initialHolders.length);
      setHasMoreHolders(initialHolders.length >= ACTIVITY_PAGE_SIZE);
      setHoldersReady(true);
    }
  }, [initialHolders]);

  useEffect(() => {
    if (initialHolders?.length) return;
    let cancelled = false;

    void (async () => {
      const rows = await fetchHoldersPage(0, false);
      if (!cancelled && rows == null) {
        setHolderRows([]);
        setHoldersReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchHoldersPage, initialHolders?.length, tokenAddress]);

  useEffect(() => {
    if (tab !== "holders" || !wsConnected) return;
    const timer = window.setInterval(() => {
      void fetchHoldersPage(0, false);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [fetchHoldersPage, tab, tokenAddress, wsConnected]);

  useEffect(() => {
    if (holdersRefreshKey <= 0) return;
    void fetchHoldersPage(0, false);
  }, [fetchHoldersPage, holdersRefreshKey]);

  return (
    <section className="panel-surface token-trade-tape overflow-hidden">
      <div className="trade-panel-mode-tabs shrink-0" role="tablist" aria-label="Trades and holders">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "trades"}
          onClick={() => setTab("trades")}
          className={
            tab === "trades"
              ? "trade-panel-mode-tab trade-panel-mode-tab--active"
              : "trade-panel-mode-tab"
          }
        >
          Trades
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "holders"}
          onClick={() => setTab("holders")}
          className={
            tab === "holders"
              ? "trade-panel-mode-tab trade-panel-mode-tab--active"
              : "trade-panel-mode-tab"
          }
        >
          Holders
        </button>
      </div>

      <div className="token-trade-tape__scroll">
        {tab === "holders" ? (
          !holdersReady ? (
            <p className="token-tape-empty">Verifying holders on-chain…</p>
          ) : holderRows.length === 0 ? (
            <p className="token-tape-empty">No holders yet.</p>
          ) : (
            <div className={activityTableScrollClass}>
              <table className="token-tape-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="token-tape-table__col-mid">Balance</th>
                    <th className="token-tape-table__col-mid">Supply</th>
                    <th>Entry</th>
                    <th className="token-tape-table__col-end">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {holderRows.map((row) => {
                    const avgEntryUsd = positionAvgEntryUsd(
                      row.netTokens,
                      row.remainingCostBasisUsd,
                      row.remainingCostBasisBnb,
                      bnbUsd
                    );
                    const unrealizedPnlUsd = positionUnrealizedUsd(
                      row.netTokens,
                      currentPriceBnb,
                      row.remainingCostBasisUsd,
                      row.remainingCostBasisBnb,
                      bnbUsd
                    );
                    const unrealizedPnlPct = positionUnrealizedPct(
                      unrealizedPnlUsd,
                      row.remainingCostBasisUsd,
                      row.remainingCostBasisBnb,
                      bnbUsd
                    );
                    const pnlTone =
                      unrealizedPnlUsd == null
                        ? "text-pump-muted"
                        : unrealizedPnlUsd >= 0
                          ? "text-pump-success"
                          : "text-pump-danger";

                    return (
                      <tr key={row.address}>
                        <td className="token-tape-table__account">
                          <IdentityPill
                            address={row.address}
                            showCreatorBadge={row.address.toLowerCase() === creatorKey}
                            onAddressClick={onAddressClick}
                          />
                        </td>
                        <td className="token-tape-table__col-mid token-tape-table__value financial-value">
                          {formatTokenAmount(row.netTokens)}
                        </td>
                        <td className="token-tape-table__col-mid token-tape-table__value financial-value token-tape-table__muted">
                          {formatSupplyShare(row.netTokens)}
                        </td>
                        <td className="token-tape-table__value financial-value token-tape-table__muted">
                          {formatUsdReadable(avgEntryUsd, { compact: true })}
                        </td>
                        <td className="token-tape-table__col-end">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <span className={`financial-value text-caption font-medium ${pnlTone}`}>
                              {formatUsdReadable(unrealizedPnlUsd, { compact: true, signed: true })}
                            </span>
                            <PctChange
                              value={unrealizedPnlPct}
                              className="text-[11px]"
                              toneClassName={pnlTone}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div ref={holderSentinelRef}>
                <LoadMoreSentinel loading={loadingMoreHolders} label="Loading holders…" />
              </div>
            </div>
          )
        ) : displayedTrades.length === 0 ? (
          <p className="token-tape-empty">No trades yet.</p>
        ) : (
          <div className={activityTableScrollClass}>
            <table className="token-tape-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Amount</th>
                  <th className="token-tape-table__col-mid">${symbol}</th>
                  <th>Price</th>
                  <th className="token-tape-table__col-end">Time</th>
                  <th className="token-tape-table__col-end">Txn</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.map((trade) => {
                  const isBuy = trade.side === "BUY";
                  const isOptimistic = trade.id.startsWith("optimistic:");
                  const tradeNetUsd = tradeNetUsdForDisplay(trade, bnbUsd);
                  return (
                    <tr
                      key={trade.id}
                      className={tradeRowClass(trade.id, trade.side, isOptimistic)}
                    >
                      <td className="token-tape-table__account">
                        <IdentityPill
                          address={trade.traderAddress}
                          showCreatorBadge={trade.traderAddress.toLowerCase() === creatorKey}
                          onAddressClick={onAddressClick}
                        />
                      </td>
                      <td
                        className={`token-tape-table__value financial-value font-medium ${
                          isBuy ? "text-pump-success" : "text-pump-danger"
                        }`}
                      >
                        {formatUsdReadable(tradeNetUsd)}
                      </td>
                      <td className="token-tape-table__col-mid token-tape-table__value financial-value token-tape-table__muted">
                        {formatTokenAmount(Number(trade.tokenAmount))}
                      </td>
                      <td className="token-tape-table__value financial-value token-tape-table__muted">
                        {formatTradeFillPriceUsd(
                          trade.nativeAmount,
                          trade.tokenAmount,
                          bnbUsd,
                          trade.feeBnb,
                          trade.netBnb,
                          trade.priceBnb,
                          trade.nativeUsdRate
                        )}
                      </td>
                      <td className="token-tape-table__col-end token-tape-table__muted">
                        {formatTradeClockTime(trade.blockTime)}
                      </td>
                      <td className="token-tape-table__col-end">
                        <a
                          href={explorerTxUrl(trade.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="financial-value text-caption text-pump-muted transition hover:text-pump-accent"
                        >
                          {shortAddress(trade.txHash, true)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div ref={tradeSentinelRef}>
              <LoadMoreSentinel loading={loadingMoreTrades} label="Loading trades…" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
