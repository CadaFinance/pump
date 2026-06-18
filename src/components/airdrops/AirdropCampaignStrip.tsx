"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AirdropListItem } from "@/lib/db/airdrops";
import { getAirdropDisplayStatus, formatAirdropDisplayStatus } from "@/lib/airdrop-status";
import {
  formatAirdropReward,
  formatTimeRemaining,
  formatDurationUntil,
} from "@/lib/airdrop-board-format";
import { AirdropGuaranteeBadge } from "@/components/airdrops/AirdropGuaranteeBadge";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/lib/icons";

type AirdropCampaignStripProps = {
  tokenAddress: string;
};

export function AirdropCampaignStrip({ tokenAddress }: AirdropCampaignStripProps) {
  const [campaign, setCampaign] = useState<AirdropListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/airdrops/by-token/${tokenAddress.toLowerCase()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { data?: AirdropListItem | null };
        if (!cancelled && res.ok) {
          setCampaign(json.data ?? null);
        }
      } catch {
        if (!cancelled) setCampaign(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  if (loading || !campaign) return null;

  const displayStatus = getAirdropDisplayStatus({
    status: campaign.status,
    qualifyStart: campaign.qualifyStart,
    qualifyEnd: campaign.qualifyEnd,
    claimEnd: campaign.claimEnd,
    merkleRoot: campaign.status === "FINALIZED" ? "0x1" : null,
  });

  const timeLabel =
    displayStatus === "UPCOMING"
      ? `Opens in ${formatDurationUntil(campaign.qualifyStart)}`
      : displayStatus === "QUALIFYING"
        ? `${formatTimeRemaining(campaign.qualifyEnd)} left`
        : displayStatus === "CLAIMABLE"
          ? "Claim window open"
          : formatAirdropDisplayStatus(displayStatus);

  const poolLabel = formatAirdropReward(campaign.totalFunded, {
    isBnb: !campaign.rewardToken,
    symbol: campaign.rewardSymbol,
  });

  return (
    <Link
      href={`/airdrops/${campaign.id}`}
      className="airdrop-campaign-strip panel-interactive flex items-center gap-3 p-3 md:p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="section-label">Guaranteed airdrop live</p>
          <AirdropGuaranteeBadge compact />
        </div>
        <p className="mt-1 text-body-sm font-medium text-pump-text">
          <span className="financial-value">{poolLabel}</span>
          <span className="text-pump-muted"> locked · {timeLabel}</span>
        </p>
        <p className="mt-0.5 text-caption text-pump-muted">
          {campaign.title ?? campaign.linkedSymbol ?? "Campaign"} — qualify to compete for TOP 100
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-pump-muted"
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
    </Link>
  );
}
