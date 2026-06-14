"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MyAirdropParticipation } from "@/lib/db/airdrops";
import {
  airdropStatusBadgeClass,
  formatAirdropDisplayStatus,
} from "@/lib/airdrop-status";
import { formatAirdropReward, formatTimeRemaining } from "@/lib/airdrop-board-format";
import { nextActionLabel } from "@/lib/airdrop-participant-snapshot";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import { MetricIcons } from "@/lib/metric-icons";
import { ICON_STROKE } from "@/lib/icons";

function poolSymbol(item: MyAirdropParticipation): string {
  return item.linkedSymbol ?? item.linkedToken.slice(0, 6);
}

function timeLeftLabel(item: MyAirdropParticipation): string {
  switch (item.displayStatus) {
    case "UPCOMING":
      return "Soon";
    case "QUALIFYING":
      return formatTimeRemaining(item.qualifyEnd);
    case "CLAIMABLE":
      return item.claimEnd ? formatTimeRemaining(item.claimEnd) : "Open";
    default:
      return "—";
  }
}

export function PortfolioAirdropsSection({ address }: { address: string }) {
  const [items, setItems] = useState<MyAirdropParticipation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(
          `/api/airdrops/mine?address=${encodeURIComponent(address)}&limit=5`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as { data?: MyAirdropParticipation[] };
        if (!cancelled && res.ok && Array.isArray(json.data)) {
          setItems(json.data);
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return (
      <div className="space-y-2 md:space-y-3">
        <h3 className="section-heading text-h3 inline-flex items-center gap-2">
          <MetricIcons.airdrops
            className="hidden h-[1.05em] w-[1.05em] shrink-0 text-pump-accent sm:block"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          Airdrops
        </h3>
        <div className="panel-surface h-24 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="section-heading text-h3 inline-flex items-center gap-2">
          <MetricIcons.airdrops
            className="hidden h-[1.05em] w-[1.05em] shrink-0 text-pump-accent sm:block"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          Airdrops ({items.length})
        </h3>
        <Link
          href="/airdrops"
          className="text-caption font-medium text-pump-accent hover:underline"
        >
          View all
        </Link>
      </div>

      <section className="panel-surface divide-y divide-pump-border/10 overflow-hidden">
        {items.map((item) => {
          const symbol = poolSymbol(item);
          const isBnb = !item.rewardToken;
          const action = nextActionLabel(item.nextAction);

          return (
            <Link
              key={item.id}
              href={`/airdrops/${item.id}`}
              className="flex items-center gap-3 p-3 transition hover:bg-pump-border/5"
            >
              <TokenAvatar address={item.linkedToken} symbol={symbol} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-body-sm font-semibold text-pump-text">
                    {item.title ?? symbol}
                  </p>
                  <span className={airdropStatusBadgeClass(item.displayStatus)}>
                    {formatAirdropDisplayStatus(item.displayStatus)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-pump-surface/70">
                    <div
                      className="h-full rounded-full bg-pump-accent transition-all"
                      style={{ width: `${item.progressPct}%` }}
                    />
                  </div>
                  <span className="financial-value shrink-0 text-caption tabular-nums text-pump-muted">
                    {item.progressPct}%
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-pump-muted">
                  <span>
                    {formatAirdropReward(item.totalFunded, {
                      isBnb,
                      symbol: item.rewardSymbol,
                    })}
                  </span>
                  <span>·</span>
                  <span>{timeLeftLabel(item)}</span>
                  {item.viewerRank != null ? (
                    <>
                      <span>·</span>
                      <span>Rank #{item.viewerRank}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-caption font-medium text-pump-accent">{action} →</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
