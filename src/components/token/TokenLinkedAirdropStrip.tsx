"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  formatAirdropReward,
  formatDurationUntil,
  formatTimeRemaining,
} from "@/lib/airdrop-board-format";
import {
  airdropStatusBadgeClass,
  formatAirdropDisplayStatus,
  type AirdropDisplayStatus,
} from "@/lib/airdrop-status";
import type { TokenAirdropPromo } from "@/lib/db/airdrops";
import { ICON_STROKE } from "@/lib/icons";
import { MetricIcons } from "@/lib/metric-icons";
import { IconLabel } from "@/components/ui/IconLabel";

function phaseCaption(campaign: TokenAirdropPromo): string {
  switch (campaign.displayStatus) {
    case "UPCOMING":
      return `Opens in ${formatDurationUntil(campaign.qualifyStart)}`;
    case "QUALIFYING":
      return `${formatTimeRemaining(campaign.qualifyEnd)} left to qualify`;
    case "FINALIZING":
      return "Finalizing winners";
    case "CLAIMABLE":
      return campaign.claimEnd
        ? `${formatTimeRemaining(campaign.claimEnd)} left to claim`
        : "Claims open";
    case "CLOSED":
      return "";
  }
}

function campaignTitle(campaign: TokenAirdropPromo): string {
  return campaign.title?.trim() || "Guaranteed airdrop";
}

type TokenLinkedAirdropStripProps = {
  tokenAddress: string;
};

export function TokenLinkedAirdropStrip({ tokenAddress }: TokenLinkedAirdropStripProps) {
  const [campaign, setCampaign] = useState<TokenAirdropPromo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, setNowTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/tokens/${tokenAddress.toLowerCase()}/airdrops`, {
          cache: "no-store",
        });
        const body = (await response.json()) as { data?: TokenAirdropPromo | null };
        if (!cancelled && response.ok) {
          const next = body.data ?? null;
          setCampaign(next?.displayStatus === "CLOSED" ? null : next);
        }
      } catch {
        if (!cancelled) setCampaign(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  useEffect(() => {
    if (!campaign) return;
    const id = window.setInterval(() => setNowTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(id);
  }, [campaign]);

  if (!loaded || !campaign || campaign.displayStatus === "CLOSED") {
    return null;
  }

  const poolLabel = formatAirdropReward(campaign.totalFunded, {
    isBnb: !campaign.rewardToken,
    symbol: campaign.rewardSymbol,
  });
  const status = campaign.displayStatus as AirdropDisplayStatus;

  return (
    <Link
      href={`/airdrops/${campaign.id}`}
      className="panel-interactive flex items-center gap-3 rounded-lg border border-pump-accent/20 bg-pump-accent/5 px-3 py-2.5 md:px-4 md:py-3"
    >
      <MetricIcons.airdrops
        className="h-4 w-4 shrink-0 text-pump-accent"
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-body-sm font-semibold text-pump-text">{campaignTitle(campaign)}</p>
          <span className="status-badge shrink-0 border-pump-success/40 bg-pump-success/10 text-[10px] text-pump-success">
            100% guaranteed
          </span>
          <span className={airdropStatusBadgeClass(status)}>{formatAirdropDisplayStatus(status)}</span>
        </div>
        <p className="mt-0.5 text-caption text-pump-muted">
          <IconLabel
            icon={MetricIcons.rewardPool}
            iconClassName="h-3 w-3"
            className="inline-flex items-center gap-1"
          >
            <span className="financial-value text-pump-text">{poolLabel}</span>
          </IconLabel>
          <span className="mx-1.5 text-pump-muted/50" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">{phaseCaption(campaign)}</span>
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-pump-muted" strokeWidth={ICON_STROKE} aria-hidden />
    </Link>
  );
}
