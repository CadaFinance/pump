"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { shortAddress } from "@/config/chain";
import type { AirdropListItem } from "@/lib/db/airdrops";
import {
  airdropStatusBadgeClass,
  formatAirdropDisplayStatus,
  getAirdropDisplayStatus,
  type AirdropDisplayStatus,
} from "@/lib/airdrop-status";
import {
  airdropRewardUsd,
  formatAirdropReward,
  formatDurationUntil,
  formatQualifyDate,
  formatQualifyDateTime,
  formatTimeRemaining,
  isEndingSoon,
  qualifyWindowProgress,
} from "@/lib/airdrop-board-format";
import { Plus, Bookmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { AirdropsSkeleton } from "@/components/airdrops/AirdropsSkeleton";
import { useAirdropSaves } from "@/components/airdrops/AirdropSavesProvider";
import { FieldSearchInput } from "@/components/ui/FieldSearchInput";
import { IconLabel, SectionHeadingIcon, TableHeaderLabel } from "@/components/ui/IconLabel";
import { ICON_STROKE } from "@/lib/icons";
import { MetricIcons } from "@/lib/metric-icons";
import { RECENT_STRIP_DESKTOP, RECENT_STRIP_MOBILE } from "@/lib/recent-strip-limits";
import { HourglassIcon } from "@/components/ui/HourglassIcon";
import {
  AirdropPoolTokenMetric,
  AirdropProgressMetric,
  AirdropRewardPoolMetric,
  AirdropStatusMetric,
  airdropListRewardProps,
} from "@/components/airdrops/AirdropMetricCells";
import { AirdropMetricsStrip } from "@/components/airdrops/AirdropMetricsStrip";
import { TokenAvatar } from "@/components/token/TokenAvatar";
import { BnbLogo } from "@/components/token/BnbLogo";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { formatUsdReadable } from "@/lib/format-usd";

type AirdropFilter =
  | "all"
  | "qualifying"
  | "claimable"
  | "upcoming"
  | "endingSoon"
  | "ended"
  | "highValue"
  | "saved"
  | "mine";
type SortKey = "reward" | "end" | "start" | "status";
type SortDir = "asc" | "desc";

type EnrichedAirdrop = AirdropListItem & {
  displayStatus: AirdropDisplayStatus;
  rewardNum: number;
  rewardUsd: number;
};

const HIGH_VALUE_THRESHOLD = 10_000;
const ENDING_SOON_HOURS = 48;

function rewardUsdValue(
  item: Pick<AirdropListItem, "totalFunded" | "rewardToken" | "rewardPriceBnb">,
  bnbUsd: number | null | undefined
): number {
  const usd = airdropRewardUsd(item, bnbUsd);
  if (usd != null) return usd;
  return Number(item.totalFunded) || 0;
}

const createCampaignButtonClass =
  "toolbar-btn toolbar-btn-accent shrink-0";

function CreateCampaignLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/airdrops/create"
      prefetch={true}
      className={`${createCampaignButtonClass} inline-flex items-center gap-1.5 ${className}`}
    >
      <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
      <span>Create airdrop</span>
    </Link>
  );
}

function enrichItem(item: AirdropListItem, bnbUsd: number | null): EnrichedAirdrop {
  return {
    ...item,
    displayStatus: getAirdropDisplayStatus({
      status: item.status,
      qualifyStart: item.qualifyStart,
      qualifyEnd: item.qualifyEnd,
      claimEnd: item.claimEnd,
      merkleRoot: item.status === "FINALIZED" ? "0x1" : null,
    }),
    rewardNum: Number(item.totalFunded) || 0,
    rewardUsd: rewardUsdValue(item, bnbUsd),
  };
}

function campaignTitle(item: AirdropListItem): string {
  return item.title ?? item.linkedName ?? item.linkedSymbol ?? shortAddress(item.linkedToken);
}

function poolSymbol(item: AirdropListItem): string {
  return item.linkedSymbol ?? shortAddress(item.linkedToken);
}

function BnbRewardIcon({ size = 18 }: { size?: number }) {
  return <BnbLogo size={size} />;
}

function RewardPoolDisplay({
  item,
  bnbUsd,
  avatarSize = 18,
  showUsd = false,
  amountClassName = "financial-value truncate text-caption font-semibold text-pump-text",
}: {
  item: AirdropListItem;
  bnbUsd: number | null;
  avatarSize?: number;
  showUsd?: boolean;
  amountClassName?: string;
}) {
  const isBnb = !item.rewardToken;
  const usd = airdropRewardUsd(item, bnbUsd);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {isBnb ? (
        <BnbRewardIcon size={avatarSize} />
      ) : (
        <TokenAvatar
          address={item.rewardToken!}
          symbol={item.rewardSymbol ?? "?"}
          size={avatarSize}
        />
      )}
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className={amountClassName}>
          {formatAirdropReward(item.totalFunded, {
            isBnb,
            symbol: item.rewardSymbol,
          })}
        </span>
        {showUsd && usd != null ? (
          <span className="shrink-0 text-caption text-pump-muted">
            {formatUsdReadable(usd, { compact: true })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function matchesFilter(
  item: EnrichedAirdrop,
  filter: AirdropFilter,
  savedIds: Set<string>,
  mineIds: Set<string>
): boolean {
  if (filter === "saved") return savedIds.has(item.id);
  if (filter === "mine") return mineIds.has(item.id);
  if (filter === "qualifying") return item.displayStatus === "QUALIFYING";
  if (filter === "claimable") return item.displayStatus === "CLAIMABLE";
  if (filter === "upcoming") return item.displayStatus === "UPCOMING";
  if (filter === "endingSoon") {
    return item.displayStatus === "QUALIFYING" && isEndingSoon(item.qualifyEnd, ENDING_SOON_HOURS);
  }
  if (filter === "ended") return item.displayStatus === "CLOSED";
  if (filter === "highValue") return item.rewardUsd >= HIGH_VALUE_THRESHOLD;
  return true;
}

function statusSortWeight(status: AirdropDisplayStatus): number {
  switch (status) {
    case "QUALIFYING":
      return 4;
    case "CLAIMABLE":
      return 3;
    case "UPCOMING":
      return 2;
    case "FINALIZING":
      return 1;
    default:
      return 0;
  }
}

function timelineLabel(item: EnrichedAirdrop): string {
  switch (item.displayStatus) {
    case "UPCOMING":
      return `Starts ${formatQualifyDateTime(item.qualifyStart)}`;
    case "QUALIFYING":
      return `Ends ${formatQualifyDateTime(item.qualifyEnd)}`;
    case "FINALIZING":
      return "Allocating winners";
    case "CLAIMABLE":
      return item.claimEnd
        ? `Claim by ${formatQualifyDateTime(item.claimEnd)}`
        : "Claims open";
    default:
      return "Campaign closed";
  }
}

function timeLeftLabel(item: EnrichedAirdrop): string {
  switch (item.displayStatus) {
    case "UPCOMING":
      return formatDurationUntil(item.qualifyStart);
    case "QUALIFYING":
      return formatTimeRemaining(item.qualifyEnd);
    case "CLAIMABLE":
      return item.claimEnd ? formatTimeRemaining(item.claimEnd) : "Open";
    default:
      return "—";
  }
}

function mobileStatusLabel(status: AirdropDisplayStatus): string {
  switch (status) {
    case "QUALIFYING":
      return "Live";
    case "CLAIMABLE":
      return "Claim";
    case "UPCOMING":
      return "Soon";
    case "FINALIZING":
      return "Finalizing";
    default:
      return "Ended";
  }
}

function AirdropSaveButton({
  airdropId,
  className = "",
}: {
  airdropId: string;
  className?: string;
}) {
  const { isSaved, toggleSave } = useAirdropSaves();
  const saved = isSaved(airdropId);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSave(airdropId);
      }}
      className={`inline-flex shrink-0 items-center justify-center transition ${
        saved ? "text-pump-accent" : "text-pump-muted hover:text-pump-text"
      } ${className}`}
      aria-label={saved ? "Remove from saved" : "Save campaign"}
    >
      <Bookmark
        className={`h-4 w-4 ${saved ? "fill-current" : ""}`}
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
    </button>
  );
}

function MobileAirdropBoardRow({
  item,
  bnbUsd,
}: {
  item: EnrichedAirdrop;
  bnbUsd: number | null;
}) {
  const symbol = poolSymbol(item);
  const isBnb = !item.rewardToken;
  const usd = airdropRewardUsd(item, bnbUsd);
  const poolLabel = formatAirdropReward(item.totalFunded, {
    isBnb,
    symbol: item.rewardSymbol,
  });

  return (
    <article className="grid grid-cols-[1fr_auto] items-start gap-2 p-2.5 transition active:bg-pump-border/8">
      <Link href={`/airdrops/${item.id}`} className="flex min-w-0 items-start gap-2.5">
        <TokenAvatar
          address={item.linkedToken}
          symbol={symbol}
          size={32}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-body-sm font-semibold text-pump-text">{symbol}</p>
            <span
              className={`shrink-0 text-[10px] leading-none ${airdropStatusBadgeClass(item.displayStatus)}`}
            >
              {mobileStatusLabel(item.displayStatus)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="financial-value min-w-0 truncate text-caption font-semibold tabular-nums text-pump-text">
              <span className="font-normal text-pump-muted">Reward </span>
              {poolLabel}
              {usd != null ? (
                <span className="ml-1.5 font-medium text-pump-muted">
                  · {formatUsdReadable(usd, { compact: true })}
                </span>
              ) : null}
            </p>
            <span className="financial-value flex shrink-0 items-center gap-1 text-caption font-medium tabular-nums text-pump-muted">
              <HourglassIcon size={12} />
              {timeLeftLabel(item)}
            </span>
          </div>
        </div>
      </Link>
      <AirdropSaveButton airdropId={item.id} className="mt-0.5 h-8 w-8" />
    </article>
  );
}

function featuredBadge(status: AirdropDisplayStatus): string {
  switch (status) {
    case "QUALIFYING":
      return "Live campaign";
    case "CLAIMABLE":
      return "Claims open";
    case "UPCOMING":
      return "Starting soon";
    default:
      return "Featured";
  }
}

function HighlightAirdropCard({
  href,
  label,
  item,
  icon,
}: {
  href: string;
  label: string;
  item: EnrichedAirdrop;
  icon: LucideIcon;
}) {
  const symbol = poolSymbol(item);

  return (
    <div className="flex h-full min-w-0 flex-col gap-1">
      <IconLabel icon={icon} hideIconMobile className="section-label md:hidden" iconClassName="h-3 w-3">
        {label}
      </IconLabel>
      <Link
        href={href}
        className="panel-interactive flex min-h-[2.625rem] flex-1 min-w-0 flex-nowrap items-center gap-2 px-2.5 py-2.5 md:min-h-[3rem] md:justify-between md:gap-3 md:px-3 md:py-3"
      >
        <IconLabel
          icon={icon}
          hideIconMobile
          className="section-label hidden shrink-0 md:inline-flex"
        >
          {label}
        </IconLabel>
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <TokenAvatar address={item.linkedToken} symbol={symbol} size={18} />
          <p className="truncate text-caption font-medium text-pump-text">${symbol}</p>
        </div>
      </Link>
    </div>
  );
}

function HighlightAirdropPlaceholder({ label, icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-1">
      <IconLabel icon={icon} hideIconMobile className="section-label md:hidden" iconClassName="h-3 w-3">
        {label}
      </IconLabel>
      <div className="panel-surface flex min-h-[2.625rem] flex-1 min-w-0 flex-nowrap items-center gap-2 px-2.5 py-2.5 md:min-h-[3rem] md:justify-between md:gap-3 md:px-3 md:py-3">
        <IconLabel
          icon={icon}
          hideIconMobile
          className="section-label hidden shrink-0 md:inline-flex"
        >
          {label}
        </IconLabel>
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <span className="inline-block h-[18px] w-[18px] shrink-0" aria-hidden />
          <p className="text-caption font-medium text-pump-muted">—</p>
        </div>
      </div>
    </div>
  );
}

function pickFeatured(items: EnrichedAirdrop[]): EnrichedAirdrop | null {
  if (!items.length) return null;

  const byPriority = (list: EnrichedAirdrop[]) =>
    [...list].sort((a, b) => b.rewardUsd - a.rewardUsd)[0] ?? null;

  const qualifying = items.filter((i) => i.displayStatus === "QUALIFYING");
  if (qualifying.length) return byPriority(qualifying);

  const claimable = items.filter((i) => i.displayStatus === "CLAIMABLE");
  if (claimable.length) return byPriority(claimable);

  const upcoming = items.filter((i) => i.displayStatus === "UPCOMING");
  if (upcoming.length) return byPriority(upcoming);

  return byPriority(items);
}

export function AirdropsListClient() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { saves } = useAirdropSaves();
  const [items, setItems] = useState<AirdropListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<AirdropFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("reward");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [nowTick, setNowTick] = useState(0);
  const [mineIds, setMineIds] = useState<Set<string>>(new Set());
  const { bnbUsd } = useBnbUsdPrice();

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/airdrops", { cache: "no-store" });
      const json = (await res.json()) as { data?: AirdropListItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load airdrops");
      setItems(json.data ?? []);
      setError(null);
    } catch (err) {
      setItems(null);
      setError(err instanceof Error ? err.message : "Failed to load airdrops");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!address) {
      setMineIds(new Set());
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/airdrops/mine?address=${encodeURIComponent(address)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          data?: Array<{ id: string } | string>;
        };
        if (!cancelled && res.ok && Array.isArray(json.data)) {
          setMineIds(
            new Set(json.data.map((entry) => (typeof entry === "string" ? entry : entry.id)))
          );
        }
      } catch {
        if (!cancelled) setMineIds(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const resolvedItems = useMemo(
    () => (items ?? []).map((item) => enrichItem(item, bnbUsd)),
    [items, bnbUsd]
  );
  const featured = useMemo(() => pickFeatured(resolvedItems), [resolvedItems]);

  const stats = useMemo(() => {
    let totalUsd = 0;
    let pricedCount = 0;
    for (const item of resolvedItems) {
      const usd = airdropRewardUsd(item, bnbUsd);
      if (usd != null) {
        totalUsd += usd;
        pricedCount += 1;
      }
    }
    return {
      totalUsd: pricedCount > 0 ? totalUsd : null,
    };
  }, [resolvedItems, bnbUsd]);

  const largestReward = useMemo(() => {
    const active = resolvedItems.filter(
      (item) =>
        item.displayStatus === "QUALIFYING" || item.displayStatus === "UPCOMING"
    );
    return [...active].sort((a, b) => b.rewardUsd - a.rewardUsd)[0] ?? null;
  }, [resolvedItems]);

  const endingSoonest = useMemo(() => {
    const qualifying = resolvedItems.filter((i) => i.displayStatus === "QUALIFYING");
    if (!qualifying.length) return null;
    return [...qualifying].sort(
      (a, b) => new Date(a.qualifyEnd).getTime() - new Date(b.qualifyEnd).getTime()
    )[0];
  }, [resolvedItems]);

  const filterCounts = useMemo(() => {
    return {
      all: resolvedItems.length,
      qualifying: resolvedItems.filter((i) => matchesFilter(i, "qualifying", saves, mineIds)).length,
      claimable: resolvedItems.filter((i) => matchesFilter(i, "claimable", saves, mineIds)).length,
      upcoming: resolvedItems.filter((i) => matchesFilter(i, "upcoming", saves, mineIds)).length,
      endingSoon: resolvedItems.filter((i) => matchesFilter(i, "endingSoon", saves, mineIds)).length,
      ended: resolvedItems.filter((i) => matchesFilter(i, "ended", saves, mineIds)).length,
      highValue: resolvedItems.filter((i) => matchesFilter(i, "highValue", saves, mineIds)).length,
      saved: resolvedItems.filter((i) => matchesFilter(i, "saved", saves, mineIds)).length,
      mine: resolvedItems.filter((i) => matchesFilter(i, "mine", saves, mineIds)).length,
    };
  }, [resolvedItems, saves, mineIds]);

  const myCampaignItems = useMemo(() => {
    return resolvedItems.filter((item) => mineIds.has(item.id)).slice(0, 3);
  }, [resolvedItems, mineIds]);

  const boardItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = resolvedItems.filter((item) => {
      if (term) {
        const haystack = [
          campaignTitle(item),
          poolSymbol(item),
          item.linkedName,
          item.linkedSymbol,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return matchesFilter(item, activeFilter, saves, mineIds);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (activeFilter === "all") {
        const aClosed = a.displayStatus === "CLOSED";
        const bClosed = b.displayStatus === "CLOSED";
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
      }

      let delta = 0;
      if (sortKey === "reward") delta = a.rewardUsd - b.rewardUsd;
      else if (sortKey === "end") {
        delta = new Date(a.qualifyEnd).getTime() - new Date(b.qualifyEnd).getTime();
      } else if (sortKey === "start") {
        delta = new Date(a.qualifyStart).getTime() - new Date(b.qualifyStart).getTime();
      } else {
        delta = statusSortWeight(a.displayStatus) - statusSortWeight(b.displayStatus);
      }
      return sortDir === "asc" ? delta : -delta;
    });

    return sorted;
  }, [resolvedItems, search, activeFilter, sortKey, sortDir, saves, mineIds]);

  const walletFilterActive =
    (activeFilter === "saved" || activeFilter === "mine") && !isConnected;

  function onSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "reward" ? "desc" : "asc");
  }

  const sortLabel = (key: SortKey) =>
    sortKey === key ? `${sortDir === "asc" ? "↑" : "↓"}` : "";
  const sortHeadClass = (key: SortKey) =>
    `inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition ${
      sortKey === key ? "text-pump-accent" : "text-pump-muted hover:text-pump-text"
    }`;

  if (items === null && !error) {
    return <AirdropsSkeleton />;
  }

  if (error) {
    return <div className="notice-error p-4">{error}</div>;
  }

  if (resolvedItems.length === 0) {
    return (
      <div className="panel-surface p-8 text-center">
        <p className="text-body-sm text-pump-muted">No active airdrop campaigns yet.</p>
        <CreateCampaignLink className="mt-4 h-10 px-5 text-body-sm" />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {featured ? (
        <>
          <SectionHeadingIcon icon={MetricIcons.featured}>Featured campaign</SectionHeadingIcon>
        <section className="space-y-2 md:space-y-3">
          <Link
            href={`/airdrops/${featured.id}`}
            className="panel-interactive block p-3 md:p-4"
          >
            <div className="flex items-start justify-between gap-2 md:gap-4">
              <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                <TokenAvatar
                  address={featured.linkedToken}
                  symbol={poolSymbol(featured)}
                  size={38}
                  className="md:hidden"
                />
                <TokenAvatar
                  address={featured.linkedToken}
                  symbol={poolSymbol(featured)}
                  size={46}
                  className="hidden md:block"
                />
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-pump-text md:card-title">
                    {campaignTitle(featured)}
                  </p>
                  <p className="text-caption text-pump-muted">
                    <span className="md:hidden">${poolSymbol(featured)}</span>
                    <span className="hidden md:inline">
                      Pool ${poolSymbol(featured)} · Escrow on-chain
                    </span>
                  </p>
                </div>
              </div>
              <span className="status-badge shrink-0 text-[10px] md:text-[inherit]">
                {featuredBadge(featured.displayStatus)}
              </span>
            </div>

            <AirdropMetricsStrip
              className="mt-3 md:mt-4"
              reward={
                <AirdropRewardPoolMetric {...airdropListRewardProps(featured, bnbUsd)} />
              }
              progress={
                <AirdropProgressMetric
                  timeLabel={nowTick >= 0 ? timeLeftLabel(featured) : "—"}
                  progressPct={qualifyWindowProgress(featured.qualifyStart, featured.qualifyEnd)}
                />
              }
              poolToken={
                <AirdropPoolTokenMetric
                  tokenAddress={featured.linkedToken}
                  symbol={poolSymbol(featured)}
                />
              }
              status={<AirdropStatusMetric status={featured.displayStatus} />}
              footer={
                featured.displayStatus === "UPCOMING" ||
                featured.displayStatus === "QUALIFYING" ? (
                  <>
                    Qualify window · {formatQualifyDate(featured.qualifyStart)} –{" "}
                    {formatQualifyDate(featured.qualifyEnd)}
                  </>
                ) : (
                  timelineLabel(featured)
                )
              }
            />
          </Link>

          {resolvedItems.length > 1 ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:flex-wrap md:overflow-visible">
              <IconLabel
                icon={MetricIcons.recent}
                hideIconMobile
                className="section-label shrink-0 text-[10px] md:text-[inherit]"
              >
                More
              </IconLabel>
              {resolvedItems
                .filter((item) => item.id !== featured.id)
                .slice(0, RECENT_STRIP_DESKTOP)
                .map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/airdrops/${item.id}`}
                    className={`inline-flex shrink-0 items-center gap-1.5 border border-pump-border/45 bg-pump-border/4 px-2 py-0.5 text-caption text-pump-muted hover:text-pump-text md:gap-2 md:px-2.5 md:py-1${index >= RECENT_STRIP_MOBILE ? " hidden md:inline-flex" : ""}`}
                  >
                    <TokenAvatar address={item.linkedToken} symbol={poolSymbol(item)} size={16} className="md:hidden" />
                    <TokenAvatar address={item.linkedToken} symbol={poolSymbol(item)} size={18} className="hidden md:block" />
                    <span className="text-caption font-medium text-pump-text">{poolSymbol(item)}</span>
                  </Link>
                ))}
            </div>
          ) : null}
        </section>
        </>
      ) : null}

      <section className="grid grid-cols-2 items-stretch gap-2 md:grid-cols-3 md:gap-3">
        <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1">
          <IconLabel
            icon={MetricIcons.totalRewards}
            hideIconMobile
            className="section-label md:hidden"
          >
            Total rewards
          </IconLabel>
          <div className="panel-surface flex flex-nowrap items-center justify-between gap-2 px-2.5 py-2.5 md:gap-3 md:px-3 md:py-3">
            <IconLabel
              icon={MetricIcons.totalRewards}
              hideIconMobile
              className="section-label hidden shrink-0 md:inline-flex"
            >
              Total rewards
            </IconLabel>
            <p className="financial-value shrink-0 text-body-sm font-semibold text-pump-text">
              {stats.totalUsd != null ? formatUsdReadable(stats.totalUsd, { compact: true }) : "—"}
            </p>
            <p className="min-w-0 truncate text-right text-caption text-pump-muted">
              {resolvedItems.length} campaigns · USD est.
            </p>
          </div>
        </div>

        {largestReward ? (
          <HighlightAirdropCard
            href={`/airdrops/${largestReward.id}`}
            label="Largest pool"
            item={largestReward}
            icon={MetricIcons.largestPool}
          />
        ) : (
          <HighlightAirdropPlaceholder label="Largest pool" icon={MetricIcons.largestPool} />
        )}

        {endingSoonest ? (
          <HighlightAirdropCard
            href={`/airdrops/${endingSoonest.id}`}
            label="Ending soon"
            item={endingSoonest}
            icon={MetricIcons.endingSoon}
          />
        ) : (
          <HighlightAirdropPlaceholder label="Ending soon" icon={MetricIcons.endingSoon} />
        )}
      </section>

      {isConnected && myCampaignItems.length > 0 ? (
        <section className="space-y-2 md:space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SectionHeadingIcon icon={MetricIcons.missions}>My campaigns</SectionHeadingIcon>
            {mineIds.size > 3 ? (
              <button
                type="button"
                onClick={() => setActiveFilter("mine")}
                className="text-caption font-medium text-pump-accent hover:underline"
              >
                View all ({mineIds.size})
              </button>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {myCampaignItems.map((item) => (
              <Link
                key={item.id}
                href={`/airdrops/${item.id}`}
                className="panel-interactive flex items-center justify-between gap-3 p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <TokenAvatar address={item.linkedToken} symbol={poolSymbol(item)} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-pump-text">
                      {poolSymbol(item)}
                    </p>
                    <p className="truncate text-caption text-pump-muted">
                      {formatAirdropDisplayStatus(item.displayStatus)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-caption font-medium text-pump-accent">Continue →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-2 md:space-y-3">
        <div>
          <div className="flex items-center justify-between gap-3">
            <SectionHeadingIcon icon={MetricIcons.exploreAirdrops}>Explore airdrops</SectionHeadingIcon>
            <CreateCampaignLink className="h-8 px-2.5 text-caption md:hidden" />
            <CreateCampaignLink className="hidden h-9 whitespace-nowrap px-4 text-body-sm md:inline-flex" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldSearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaign or token"
            className="md:max-w-xs"
          />
          <div className="sheet-tabs -mx-2 overflow-x-auto px-2 md:mx-0 md:px-0">
            {(
              [
                ["all", "All", "All"],
                ["qualifying", "Live", "Qualifying"],
                ["claimable", "Claim", "Claimable"],
                ["upcoming", "Soon", "Upcoming"],
                ["endingSoon", "Ending", "Ending soon"],
                ["ended", "Ended", "Ended"],
                ["highValue", "High", "High value"],
                ["saved", "Saved", "Saved"],
                ["mine", "Mine", "My campaigns"],
              ] as const
            ).map(([key, mobileLabel, desktopLabel]) => {
              const count = filterCounts[key] ?? 0;
              const isSavedTab = key === "saved";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`shrink-0 max-md:px-2.5 max-md:py-1.5 ${
                    activeFilter === key ? "chip-button chip-button-active" : "chip-button"
                  }`}
                >
                  {isSavedTab ? (
                    <>
                      <span className="inline-flex items-center gap-1 md:hidden">
                        <Bookmark className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} aria-hidden />
                        <span>({count})</span>
                      </span>
                      <span className="hidden md:inline">
                        {desktopLabel} ({count})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="md:hidden">
                        {mobileLabel} ({count})
                      </span>
                      <span className="hidden md:inline">
                        {desktopLabel} ({count})
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <section className="panel-surface overflow-hidden">
          {walletFilterActive ? (
            <div className="p-8 text-center">
              <p className="text-body-sm text-pump-muted">
                Connect your wallet to view{" "}
                {activeFilter === "saved" ? "saved campaigns" : "your campaigns"}.
              </p>
              <button
                type="button"
                className="primary-button mt-4 h-10 px-5 text-body-sm"
                onClick={() => openConnectModal?.()}
              >
                Connect wallet
              </button>
            </div>
          ) : boardItems.length === 0 ? (
            <div className="p-8 text-center text-body-sm text-pump-muted">
              {activeFilter === "saved"
                ? "No saved campaigns yet. Tap the bookmark on any campaign to save it."
                : activeFilter === "mine"
                  ? "No joined campaigns yet. Complete on-chain requirements during qualify to track progress here."
                  : "No campaigns match your filters."}
            </div>
          ) : (
            <>
              <div className="sheet-list lg:hidden">
                {boardItems.map((item) => (
                  <MobileAirdropBoardRow key={item.id} item={item} bnbUsd={bnbUsd} />
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="sheet-grid min-w-[960px]">
                  <thead>
                    <tr>
                      <th className="w-10" aria-label="Save" />
                      <th>Campaign</th>
                      <th>Pool</th>
                      <th>
                        <button type="button" onClick={() => onSort("reward")} className={sortHeadClass("reward")}>
                          <TableHeaderLabel icon={MetricIcons.rewardPool}>Reward pool</TableHeaderLabel> {sortLabel("reward")}
                        </button>
                      </th>
                      <th>
                        <button type="button" onClick={() => onSort("status")} className={sortHeadClass("status")}>
                          <TableHeaderLabel icon={MetricIcons.status}>Status</TableHeaderLabel> {sortLabel("status")}
                        </button>
                      </th>
                      <th>
                        <button type="button" onClick={() => onSort("end")} className={sortHeadClass("end")}>
                          <TableHeaderLabel icon={MetricIcons.endingSoon}>Deadline</TableHeaderLabel> {sortLabel("end")}
                        </button>
                      </th>
                      <th>
                        <TableHeaderLabel icon={MetricIcons.progress}>Time left</TableHeaderLabel>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-3">
                            <AirdropSaveButton airdropId={item.id} className="h-8 w-8" />
                          </td>
                          <td>
                            <Link
                              href={`/airdrops/${item.id}`}
                              className="flex min-w-0 items-center gap-3"
                            >
                              <TokenAvatar
                                address={item.linkedToken}
                                symbol={poolSymbol(item)}
                                size={30}
                              />
                              <div className="flex min-w-0 items-baseline gap-2">
                                <p className="truncate font-medium text-pump-text">
                                  {campaignTitle(item)}
                                </p>
                                <p className="shrink-0 text-caption text-pump-muted">
                                  {poolSymbol(item)}
                                </p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/token/${item.linkedToken}`}
                              className="financial-value text-pump-text hover:text-pump-accent"
                            >
                              {poolSymbol(item)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <RewardPoolDisplay
                              item={item}
                              bnbUsd={bnbUsd}
                              avatarSize={20}
                              showUsd
                              amountClassName="financial-value text-body-sm font-semibold text-pump-text"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={airdropStatusBadgeClass(item.displayStatus)}>
                              {formatAirdropDisplayStatus(item.displayStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-pump-muted">
                            {item.displayStatus === "UPCOMING"
                              ? formatQualifyDateTime(item.qualifyStart)
                              : formatQualifyDateTime(item.qualifyEnd)}
                          </td>
                          <td className="px-4 py-3 financial-value text-pump-text">
                            {timeLeftLabel(item)}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
