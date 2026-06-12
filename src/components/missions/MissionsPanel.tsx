"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  listPendingMissionKeys,
  type OptimisticActivity,
} from "@/lib/optimistic-activity";
import { MissionsPanelSkeleton } from "@/components/missions/MissionsPanelSkeleton";

type MissionProgress = {
  current: number;
  target: number;
  unit: string;
};

type Mission = {
  taskKey: string;
  title: string;
  description: string | null;
  rewardPoints: number;
  taskKind: "DAILY" | "ONE_TIME" | "MILESTONE";
  completed: boolean;
  completedAt: string | null;
  pointsAwarded: number;
  progress?: MissionProgress;
};

type MissionsData = {
  address: string;
  totalPoints: number;
  todayUtc: string;
  tradingVolumeBnb: number;
  missions: Mission[];
};

type MissionFilter = "all" | "open" | "done";

const BURST_POLL_MS = 1_500;
const BURST_DURATION_MS = 60_000;

const missionKindLabel: Record<Mission["taskKind"], string> = {
  DAILY: "Daily",
  ONE_TIME: "One-time",
  MILESTONE: "Milestone",
};

function missionStatusBadgeClass(done: boolean, syncing: boolean): string {
  const base =
    "inline-flex shrink-0 items-center rounded-sm px-2.5 py-1 text-label font-semibold uppercase";

  if (done) {
    return `${base} border border-pump-success/35 bg-pump-success/15 text-pump-success`;
  }
  if (syncing) {
    return `${base} border border-pump-warning/35 bg-pump-warning/15 text-pump-warning`;
  }
  return `${base} border border-pump-accent/35 bg-pump-accent/15 text-pump-accent`;
}

function missionStatusLabel(done: boolean, syncing: boolean): string {
  if (done) return "Done";
  if (syncing) return "Syncing";
  return "Open";
}

function MissionRow({
  mission,
  syncing,
}: {
  mission: Mission;
  syncing: boolean;
}) {
  const progressPct =
    mission.progress && mission.progress.target > 0
      ? Math.min(100, (mission.progress.current / mission.progress.target) * 100)
      : 0;

  const done = mission.completed;
  const showSyncing = syncing && !done;

  return (
    <article className="p-2.5 md:p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-body-sm font-medium text-pump-text">{mission.title}</p>
            <span className="status-badge shrink-0 text-[10px] md:text-[inherit]">
              {missionKindLabel[mission.taskKind]}
            </span>
          </div>
          {mission.description ? (
            <p className="mt-1 text-caption leading-snug text-pump-muted">{mission.description}</p>
          ) : null}
        </div>
        <span className={missionStatusBadgeClass(done, showSyncing)}>
          {missionStatusLabel(done, showSyncing)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="financial-value text-caption font-semibold text-pump-accent">
          +{mission.rewardPoints} pts
        </span>
        {showSyncing ? (
          <span className="text-caption text-pump-warning">Syncing via indexer…</span>
        ) : null}
        {done && mission.pointsAwarded > 0 ? (
          <span className="text-caption text-pump-muted">
            Awarded {mission.pointsAwarded.toLocaleString()} pts
          </span>
        ) : null}
      </div>

      {mission.progress && !done ? (
        <div className="mt-2 rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-caption">
            <span className="section-label text-[10px]">Progress</span>
            <span className="financial-value font-medium text-pump-text">
              {mission.progress.current.toFixed(2)} / {mission.progress.target}{" "}
              {mission.progress.unit}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-pump-surface/70">
            <div
              className="h-full rounded-full bg-pump-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function MissionsPanel() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [data, setData] = useState<MissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MissionFilter>("open");
  const [pendingKeys, setPendingKeys] = useState<string[]>(() => listPendingMissionKeys());

  const loadMissions = useCallback(async (walletAddress: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/missions?address=${walletAddress}`);
      const body = (await response.json()) as { data?: MissionsData; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load missions");
      }

      setData(body.data ?? null);

      const stillPending = listPendingMissionKeys();
      setPendingKeys(stillPending);

      if (body.data && stillPending.length > 0) {
        const completedKeys = new Set(
          body.data.missions.filter((m) => m.completed).map((m) => m.taskKey)
        );
        setPendingKeys(stillPending.filter((key) => !completedKeys.has(key)));
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load missions");
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
    void loadMissions(address);
  }, [address, isConnected, loadMissions]);

  useEffect(() => {
    if (!isConnected || !address) return;

    let burstUntil = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      const delay = Date.now() < burstUntil ? BURST_POLL_MS : 15_000;
      timer = setTimeout(async () => {
        await loadMissions(address);
        schedule();
      }, delay);
    };

    const onActivity = (event: Event) => {
      const detail = (event as CustomEvent<OptimisticActivity>).detail;
      if (detail.missionKeys?.length) {
        setPendingKeys((prev) => [...new Set([...prev, ...detail.missionKeys!])]);
      }
      burstUntil = Date.now() + BURST_DURATION_MS;
      void loadMissions(address);
      schedule();
    };

    window.addEventListener("pump:activity", onActivity);
    schedule();

    return () => {
      window.removeEventListener("pump:activity", onActivity);
      if (timer) clearTimeout(timer);
    };
  }, [address, isConnected, loadMissions]);

  const completedCount = data?.missions.filter((m) => m.completed).length ?? 0;
  const openCount = data?.missions.filter((m) => !m.completed).length ?? 0;
  const totalCount = data?.missions.length ?? 0;
  const pointsToEarn =
    data?.missions.filter((m) => !m.completed).reduce((sum, m) => sum + m.rewardPoints, 0) ?? 0;

  const filterCounts = useMemo(
    () => ({
      all: totalCount,
      open: openCount,
      done: completedCount,
    }),
    [totalCount, openCount, completedCount]
  );

  const boardMissions = useMemo(() => {
    if (!data) return [];
    return data.missions.filter((mission) => {
      if (activeFilter === "open") return !mission.completed;
      if (activeFilter === "done") return mission.completed;
      return true;
    });
  }, [data, activeFilter]);

  if (!isConnected || !address) {
    return (
      <div className="panel-surface p-8 text-center">
        <p className="text-body-sm text-pump-muted">
          Connect your wallet to track Pump Points and mission progress for our upcoming app
          airdrop.
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
    return <MissionsPanelSkeleton />;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {error ? (
        <div className="notice-error p-3">
          {error}
          {error.includes("VM1_MAIN_DB_URL") ? (
            <p className="mt-2 field-hint">
              Local dev: SSH tunnel ui-app 7433 → localhost 17433 and set VM1_MAIN_DB_URL in .env
            </p>
          ) : null}
        </div>
      ) : null}

      {data && !error ? (
        <>
          <section className="rounded-lg border border-pump-accent/25 bg-gradient-to-br from-pump-accent/12 via-pump-card/70 to-pump-surface/55 p-3 md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-label text-[10px] md:text-[inherit]">Pump Points</p>
                <h3 className="mt-1 text-body-sm font-semibold text-pump-text md:card-title">
                  Upcoming app airdrop
                </h3>
                <p className="mt-1 text-caption leading-snug text-pump-muted md:text-body-sm">
                  Earn points from on-chain missions. These count toward a future Pump app airdrop —
                  not token campaigns listed under Airdrops.
                </p>
              </div>
              <span className="status-badge shrink-0 text-[10px] text-pump-accent md:text-[inherit]">
                Points live
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 md:mt-4 md:grid-cols-4 md:gap-2">
              <div className="flex min-w-0 flex-col gap-1 md:contents">
                <dt className="section-label text-[10px] md:sr-only">Total points</dt>
                <dd className="col-span-2 m-0 rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2 md:col-span-1 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-2 md:px-3">
                  <span className="section-label hidden shrink-0 whitespace-nowrap md:inline">
                    Total points
                  </span>
                  <span className="financial-value text-body-sm font-semibold text-pump-accent">
                    {data.totalPoints.toLocaleString()}
                  </span>
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="section-label text-[10px] md:hidden">Completed</dt>
                <dd className="m-0 rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-2 md:px-3">
                  <span className="section-label hidden shrink-0 whitespace-nowrap md:inline">
                    Completed
                  </span>
                  <span className="financial-value text-body-sm font-semibold text-pump-text">
                    {completedCount}/{totalCount}
                  </span>
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="section-label text-[10px] md:hidden">Available</dt>
                <dd className="m-0 rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-2 md:px-3">
                  <span className="section-label hidden shrink-0 whitespace-nowrap md:inline">
                    Available
                  </span>
                  <span className="financial-value text-body-sm font-semibold text-pump-text">
                    +{pointsToEarn.toLocaleString()} pts
                  </span>
                </dd>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <dt className="section-label text-[10px] md:hidden">Volume</dt>
                <dd className="m-0 rounded-md border border-pump-border/15 bg-pump-surface/35 px-2.5 py-2 md:flex md:flex-nowrap md:items-center md:justify-between md:gap-2 md:px-3">
                  <span className="section-label hidden shrink-0 whitespace-nowrap md:inline">
                    Volume
                  </span>
                  <span className="financial-value text-body-sm font-semibold text-pump-text">
                    {data.tradingVolumeBnb.toFixed(2)} BNB
                  </span>
                </dd>
              </div>
            </dl>

            <p className="mt-2 hidden text-caption text-pump-muted md:block">
              Daily missions reset at UTC midnight ({data.todayUtc}).
            </p>
          </section>

          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="section-heading text-h3">Your missions</h3>
              <button
                type="button"
                onClick={() => loadMissions(address)}
                disabled={loading}
                className="chip-button shrink-0 disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="-mx-2 flex gap-1.5 overflow-x-auto px-2 pb-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              {(
                [
                  ["all", "All", "All"],
                  ["open", "Open", "Open"],
                  ["done", "Done", "Done"],
                ] as const
              ).map(([key, mobileLabel, desktopLabel]) => {
                const count = filterCounts[key] ?? 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveFilter(key)}
                    className={`shrink-0 max-md:px-2.5 max-md:py-1.5 ${
                      activeFilter === key ? "chip-button chip-button-active" : "chip-button"
                    }`}
                  >
                    <span className="md:hidden">
                      {mobileLabel} ({count})
                    </span>
                    <span className="hidden md:inline">
                      {desktopLabel} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="rounded-lg border border-pump-border/15 bg-transparent">
              {boardMissions.length > 0 ? (
                <div className="divide-y divide-pump-border/10">
                  {boardMissions.map((mission) => (
                    <MissionRow
                      key={mission.taskKey}
                      mission={mission}
                      syncing={pendingKeys.includes(mission.taskKey)}
                    />
                  ))}
                </div>
              ) : (
                <p className="p-8 text-center text-body-sm text-pump-muted">
                  {activeFilter === "done"
                    ? "No completed missions yet."
                    : activeFilter === "open"
                      ? "All missions completed."
                      : "No missions available."}
                </p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
