"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { isPromotableAirdropStatus } from "@/lib/airdrop-status";
import type { TokenAirdropPromo } from "@/lib/db/airdrops";
import { ICON_STROKE } from "@/lib/icons";
import { AirdropGiftIcon } from "@/components/ui/AirdropGiftIcon";

type TokenLinkedAirdropStripProps = {
  tokenAddress: string;
};

export function TokenLinkedAirdropStrip({ tokenAddress }: TokenLinkedAirdropStripProps) {
  const [campaign, setCampaign] = useState<TokenAirdropPromo | null>(null);
  const [loaded, setLoaded] = useState(false);

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
          setCampaign(next && isPromotableAirdropStatus(next.displayStatus) ? next : null);
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

  if (!loaded || !campaign) {
    return null;
  }

  return (
    <Link
      href={`/airdrops/${campaign.id}`}
      className="token-airdrop-banner flex items-center gap-2 rounded-md border border-pump-accent/20 bg-pump-accent/[0.06] px-3 py-2 transition-colors hover:bg-pump-accent/10"
    >
      <AirdropGiftIcon size={14} />
      <span className="min-w-0 flex-1 truncate text-caption font-medium text-pump-text">
        Guaranteed airdrop
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-pump-muted" strokeWidth={ICON_STROKE} aria-hidden />
    </Link>
  );
}
