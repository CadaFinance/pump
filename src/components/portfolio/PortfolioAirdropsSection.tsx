"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MyAirdropParticipation } from "@/lib/db/airdrops";
import { MetricIcons } from "@/lib/metric-icons";
import { ICON_STROKE } from "@/lib/icons";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { ClaimAllAirdropsModal } from "@/components/portfolio/ClaimAllAirdropsModal";
import {
  JoinedAirdropsList,
  fetchJoinedAirdrops,
} from "@/components/portfolio/joined-airdrops-shared";
import {
  isPortfolioTrackedAirdrop,
  partitionJoinedAirdrops,
  sortJoinedAirdropsForPortfolio,
} from "@/lib/portfolio-airdrop-summary";

/** Fetch all joined rows from DB in one query — refresh is separate. */
const JOINED_FETCH_LIMIT = 500;

export function PortfolioAirdropsSection({ address }: { address: string }) {
  const [items, setItems] = useState<MyAirdropParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { bnbUsd } = useBnbUsdPrice();

  const reloadItems = useCallback(
    async (options?: { refresh?: boolean }) => {
      try {
        const data = await fetchJoinedAirdrops(address, JOINED_FETCH_LIMIT, {
          refresh: options?.refresh,
        });
        setItems(data);
        return data;
      } catch {
        setItems([]);
        return [];
      }
    },
    [address]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setItems([]);
      try {
        const snapshot = await fetchJoinedAirdrops(address, JOINED_FETCH_LIMIT);
        if (cancelled) return;
        setItems(snapshot);
        setLoading(false);

        const tracked = snapshot.filter(isPortfolioTrackedAirdrop);
        if (tracked.length === 0) return;

        const refreshed = await fetchJoinedAirdrops(address, JOINED_FETCH_LIMIT, {
          refresh: true,
        });
        if (!cancelled) setItems(refreshed);
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!modalOpen) return;

    let cancelled = false;
    void fetchJoinedAirdrops(address, JOINED_FETCH_LIMIT, { refresh: true })
      .then((data) => {
        if (!cancelled) setItems(data);
      });

    return () => {
      cancelled = true;
    };
  }, [address, modalOpen]);

  const visibleItems = useMemo(
    () => sortJoinedAirdropsForPortfolio(items.filter(isPortfolioTrackedAirdrop)),
    [items]
  );

  const claimableItems = useMemo(
    () => partitionJoinedAirdrops(items.filter(isPortfolioTrackedAirdrop)).claimable,
    [items]
  );

  const claimableCount = claimableItems.length;

  if (loading) {
    return null;
  }

  if (visibleItems.length === 0) {
    return (
      <div className="panel-surface empty-state">
        <p className="empty-state-copy">
          {claimableCount > 0
            ? `You have ${claimableCount} claimable reward${claimableCount === 1 ? "" : "s"} — open Airdrops to claim.`
            : "No active airdrop campaigns yet. Explore guaranteed reward pools or launch your own."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/airdrops" className="primary-button h-10 px-5 text-body-sm">
            Browse airdrops
          </Link>
          <Link href="/airdrops/create" className="secondary-button h-10 px-5 text-body-sm">
            Create campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 md:space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-heading text-h3 inline-flex items-center gap-2">
            <MetricIcons.airdrops
              className="hidden h-[1.05em] w-[1.05em] shrink-0 text-pump-accent sm:block"
              strokeWidth={ICON_STROKE}
              aria-hidden
            />
            Joined airdrops ({visibleItems.length})
          </h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={
              claimableCount > 0
                ? "primary-button shrink-0 px-3 py-1.5 text-caption"
                : "secondary-button shrink-0 px-3 py-1.5 text-caption"
            }
          >
            Claim all{claimableCount > 0 ? ` (${claimableCount})` : ""}
          </button>
        </div>

        <JoinedAirdropsList items={visibleItems} bnbUsd={bnbUsd} />
      </div>

      <ClaimAllAirdropsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        items={visibleItems}
        address={address}
        onClaimed={() => {
          void reloadItems({ refresh: true });
        }}
      />
    </>
  );
}
