"use client";

import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { contracts, shortAddress } from "@/config/chain";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";
import type {
  AirdropDetail,
  AirdropProgress,
  AirdropSocialTask,
  LeaderboardRow,
  WinnerRow,
} from "@/lib/db/airdrops";
import {
  airdropStatusBadgeClass,
  formatAirdropDisplayStatus,
  getAirdropDisplayStatus,
} from "@/lib/airdrop-status";

const SOCIAL_LABELS: Record<string, string> = {
  FOLLOW_X: "Follow on X",
  JOIN_TELEGRAM: "Join Telegram",
  JOIN_DISCORD: "Join Discord",
  VISIT_WEBSITE: "Visit website",
  RETWEET_X: "Retweet / like on X",
};

function formatSocialTaskType(taskType: string): string {
  return SOCIAL_LABELS[taskType] ?? taskType;
}

function socialTaskActionLabel(taskType: string): string {
  return `${formatSocialTaskType(taskType)} →`;
}

function formatAmount(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function RuleProgressRow({
  label,
  rule,
  unit,
}: {
  label: string;
  rule: { current: string; target: string; met: boolean };
  unit: string;
}) {
  const pct =
    Number(rule.target) > 0
      ? Math.min(100, (Number(rule.current) / Number(rule.target)) * 100)
      : rule.met
        ? 100
        : 0;

  return (
    <li className="rounded-lg border border-pump-border/20 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-pump-text">{label}</p>
        <span className={`status-badge shrink-0 ${rule.met ? "text-pump-accent" : ""}`}>
          {rule.met ? "Met" : "In progress"}
        </span>
      </div>
      <p className="mt-1 text-body-sm text-pump-muted">
        {formatAmount(rule.current)} / {formatAmount(rule.target)} {unit}
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-pump-surface/70">
        <div
          className="h-full rounded-full bg-pump-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

export function AirdropDetailPanel({ airdropId }: { airdropId: string }) {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const [detail, setDetail] = useState<AirdropDetail | null>(null);
  const [progress, setProgress] = useState<AirdropProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState<{ amount: string; proof: string[] } | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const load = useCallback(async () => {
    setError(null);
    const qs = address ? `?address=${address}` : "";
    const res = await fetch(`/api/airdrops/${airdropId}${qs}`);
    const json = (await res.json()) as { data?: AirdropDetail; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load airdrop");
    const airdrop = json.data ?? null;
    setDetail(airdrop);

    const requiredSocial = airdrop?.socialTasks.filter((t) => t.isRequired) ?? [];
    const socialDone =
      requiredSocial.length === 0 ||
      requiredSocial.every((t) => t.completed);

    if (address && airdrop && socialDone && !airdrop.merkleRoot) {
      const progRes = await fetch(`/api/airdrops/${airdropId}/progress?address=${address}`, {
        cache: "no-store",
      });
      if (progRes.ok) {
        const progJson = (await progRes.json()) as { data?: AirdropProgress };
        setProgress(progJson.data ?? null);
        setProgressError(null);
      } else {
        const progJson = (await progRes.json()) as { error?: string };
        setProgress(null);
        setProgressError(progJson.error ?? "Could not load progress");
      }
    } else {
      setProgress(null);
      setProgressError(null);
    }

    if (airdrop?.merkleRoot) {
      const w = await fetch(`/api/airdrops/${airdropId}/winners`);
      const wj = (await w.json()) as { data?: WinnerRow[] };
      setWinners(wj.data ?? []);
      setLeaderboard([]);
    } else if (socialDone) {
      const lb = await fetch(`/api/airdrops/${airdropId}/leaderboard`, { cache: "no-store" });
      if (lb.ok) {
        const lbj = (await lb.json()) as { data?: LeaderboardRow[] };
        setLeaderboard(lbj.data ?? []);
      } else {
        setLeaderboard([]);
      }
    } else {
      setLeaderboard([]);
    }

    if (address && airdrop?.merkleRoot) {
      const p = await fetch(`/api/airdrops/${airdropId}/proof/${address}`);
      if (p.ok) {
        const pj = (await p.json()) as { data?: { amount: string; proof: string[] } };
        setClaimInfo(pj.data ?? null);
      } else {
        setClaimInfo(null);
      }
    } else {
      setClaimInfo(null);
    }
  }, [airdropId, address]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [load]);

  useEffect(() => {
    if (claimConfirmed && txHash) {
      void load();
    }
  }, [claimConfirmed, txHash, load]);

  useEffect(() => {
    if (!detail || detail.merkleRoot) return;

    const status = getAirdropDisplayStatus({
      status: detail.status,
      qualifyStart: detail.qualifyStart,
      qualifyEnd: detail.qualifyEnd,
      claimEnd: detail.claimEnd,
      merkleRoot: detail.merkleRoot,
    });

    if (status !== "QUALIFYING" && status !== "FINALIZING") return;

    const timer = window.setInterval(() => {
      void load();
    }, 12_000);

    return () => window.clearInterval(timer);
  }, [detail, load]);

  async function handleSocialTaskClick(task: AirdropSocialTask) {
    if (task.completed) return;

    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    if (detail && new Date(detail.qualifyEnd) <= new Date()) {
      setError("Qualification period ended — social tasks are closed.");
      return;
    }

    setCompletingTaskId(task.id);
    setError(null);

    try {
      window.open(task.targetUrl, "_blank", "noopener,noreferrer");

      const res = await fetch(`/api/airdrops/${airdropId}/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not complete task");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
    } finally {
      setCompletingTaskId(null);
    }
  }

  function onClaim() {
    if (!isConnected || !address || !detail?.onChainId || !claimInfo || !contracts.airdropManager) {
      openConnectModal?.();
      return;
    }
    writeContract({
      address: contracts.airdropManager,
      abi: pumpAirdropManagerAbi,
      functionName: "claim",
      args: [
        BigInt(detail.onChainId),
        parseEther(claimInfo.amount),
        claimInfo.proof as `0x${string}`[],
      ],
    });
  }

  if (error && !detail) return <p className="text-body-sm text-pump-danger">{error}</p>;
  if (!detail) return <p className="text-body-sm text-pump-muted">Loading…</p>;

  const displayStatus = getAirdropDisplayStatus({
    status: detail.status,
    qualifyStart: detail.qualifyStart,
    qualifyEnd: detail.qualifyEnd,
    claimEnd: detail.claimEnd,
    merkleRoot: detail.merkleRoot,
  });

  const requiredSocialTasks = detail.socialTasks.filter((t) => t.isRequired);
  const hasSocialGate = requiredSocialTasks.length > 0;
  const socialDone = !hasSocialGate || requiredSocialTasks.every((t) => t.completed);
  const qualifyStarted = displayStatus !== "UPCOMING";
  const qualifyEnded = new Date(detail.qualifyEnd) <= new Date();
  const onchainUnlocked = socialDone && qualifyStarted;
  const showSocialSection = hasSocialGate && !socialDone;
  const hasOnchainRules = Boolean(
    detail.rules.onchain?.minHoldWei || detail.rules.onchain?.minBuyBnbWei
  );

  const userRank = address
    ? leaderboard.find((row) => row.address.toLowerCase() === address.toLowerCase())
    : undefined;

  const userWinner = address
    ? winners.find((row) => row.address.toLowerCase() === address.toLowerCase())
    : undefined;
  const userAlreadyClaimed = Boolean(userWinner?.claimed);

  return (
    <div className="space-y-4">
      {error ? <p className="text-body-sm text-pump-danger">{error}</p> : null}

      <div className="rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-pump-text">
              {detail.title ?? detail.linkedSymbol ?? shortAddress(detail.linkedToken)}
            </h3>
            {detail.description ? (
              <p className="mt-2 text-body-sm text-pump-muted">{detail.description}</p>
            ) : null}
          </div>
          <span className={airdropStatusBadgeClass(displayStatus)}>
            {formatAirdropDisplayStatus(displayStatus)}
          </span>
        </div>
        <dl className="mt-4 grid gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pump-muted">Token</dt>
            <dd>{detail.linkedSymbol ?? shortAddress(detail.linkedToken)}</dd>
          </div>
          <div>
            <dt className="text-pump-muted">Reward pool</dt>
            <dd>
              {formatAmount(detail.totalFunded)} {detail.rewardToken ? "tokens" : "BNB"}
            </dd>
          </div>
          <div>
            <dt className="text-pump-muted">Qualify</dt>
            <dd>
              {new Date(detail.qualifyStart).toLocaleString()} →{" "}
              {new Date(detail.qualifyEnd).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-pump-muted">Claim ends</dt>
            <dd>{detail.claimEnd ? new Date(detail.claimEnd).toLocaleString() : "—"}</dd>
          </div>
        </dl>
      </div>

      {displayStatus === "UPCOMING" ? (
        <p className="rounded-lg border border-pump-border/25 bg-pump-bg/40 px-3 py-2 text-body-sm text-pump-muted">
          Qualification starts {new Date(detail.qualifyStart).toLocaleString()}. You can complete
          social tasks now; on-chain tracking begins when qualify opens.
        </p>
      ) : null}

      {displayStatus === "FINALIZING" ? (
        <p className="rounded-lg border border-pump-warning/30 bg-pump-warning/5 px-3 py-2 text-body-sm text-pump-muted">
          Qualification ended. The keeper is ranking winners and submitting the Merkle root on-chain
          (usually within a few minutes). This page refreshes every 12s — when status becomes{" "}
          <span className="text-pump-accent">Claimable</span>, winners can claim. Claim window:{" "}
          {new Date(detail.qualifyEnd).toLocaleString()} →{" "}
          {detail.claimEnd ? new Date(detail.claimEnd).toLocaleString() : "24h after qualify end"}.
        </p>
      ) : null}

      {displayStatus === "CLAIMABLE" && isConnected && address && !claimInfo && !userAlreadyClaimed ? (
        <p className="rounded-lg border border-pump-border/25 bg-pump-bg/40 px-3 py-2 text-body-sm text-pump-muted">
          Airdrop finalized. If you qualified in the top 100, a claim box appears below. Otherwise you
          are not in the winner list for this round.
        </p>
      ) : null}

      {showSocialSection ? (
        <section className="rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
          <h4 className="font-medium text-pump-text">Step 1 — Social tasks</h4>
          <p className="mt-1 text-body-sm text-pump-muted">
            Complete each task to unlock on-chain requirements below.
          </p>
          <ul className="mt-3 space-y-2">
            {detail.socialTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-pump-border/20 px-3 py-2"
              >
                <p className="text-sm font-medium text-pump-text">
                  {formatSocialTaskType(task.taskType)}
                </p>
                {task.completed ? (
                  <span className="status-badge shrink-0 text-pump-accent">Done</span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary shrink-0 text-xs"
                    disabled={qualifyEnded || completingTaskId === task.id}
                    onClick={() => void handleSocialTaskClick(task)}
                  >
                    {completingTaskId === task.id
                      ? "Saving…"
                      : qualifyEnded
                        ? "Closed"
                        : socialTaskActionLabel(task.taskType)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : hasSocialGate && socialDone ? (
        <div className="rounded-lg border border-pump-accent/25 bg-pump-accent/5 px-3 py-2 text-body-sm text-pump-accent">
          Social tasks complete — on-chain qualification is active.
        </div>
      ) : null}

      {!detail.merkleRoot ? (
        <section
          className={`rounded-xl border bg-pump-surface/40 p-4 ${
            onchainUnlocked ? "border-pump-border/30" : "border-pump-border/20 opacity-80"
          }`}
        >
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-pump-text">
              {hasSocialGate ? "Step 2 — On-chain requirements" : "On-chain requirements"}
            </h4>
            {!onchainUnlocked ? (
              <span className="status-badge text-pump-muted">Locked</span>
            ) : null}
          </div>

          {!qualifyStarted ? (
            <p className="mt-2 text-body-sm text-pump-muted">
              On-chain rules activate when qualification starts.
            </p>
          ) : !onchainUnlocked ? (
            <p className="mt-2 text-body-sm text-pump-muted">
              Finish all social tasks first. Then buy or hold the target token during the qualify
              window.
            </p>
          ) : !isConnected ? (
            <p className="mt-2 text-body-sm text-pump-muted">
              Connect your wallet to see your hold / buy progress.
            </p>
          ) : !hasOnchainRules ? (
            <p className="mt-2 text-body-sm text-pump-muted">No on-chain rules configured.</p>
          ) : progressError ? (
            <p className="mt-2 text-body-sm text-pump-danger">{progressError}</p>
          ) : progress ? (
            <ul className="mt-3 space-y-2">
              {progress.minHold ? (
                <RuleProgressRow
                  label={`Min hold (${detail.linkedSymbol ?? "token"})`}
                  rule={progress.minHold}
                  unit="tokens"
                />
              ) : null}
              {progress.minBuy ? (
                <RuleProgressRow label="Min buy volume" rule={progress.minBuy} unit="BNB" />
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-pump-muted">Loading your progress…</p>
          )}

          {progress?.onchainQualified ? (
            <p className="mt-3 text-body-sm text-pump-accent">
              You meet all on-chain requirements — ranked by hold at qualify end.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
        <h4 className="font-medium text-pump-text">
          {detail.merkleRoot ? "Winners" : "Live leaderboard"}
        </h4>
        {!detail.merkleRoot && onchainUnlocked ? (
          <p className="mt-1 text-xs text-pump-muted">
            Holdings read on-chain and refresh every 12s during qualify.
          </p>
        ) : null}

        {!detail.merkleRoot && !onchainUnlocked ? (
          <p className="mt-2 text-body-sm text-pump-muted">
            Leaderboard unlocks after social tasks are complete.
          </p>
        ) : null}

        {!detail.merkleRoot && onchainUnlocked && userRank ? (
          <p className="mt-2 text-body-sm text-pump-accent">
            Your live rank: #{userRank.rank} · {formatAmount(userRank.holdAmount)} tokens held
          </p>
        ) : null}

        {detail.merkleRoot ? (
          winners.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {winners.map((row) => (
                <li key={row.rank} className="flex justify-between text-sm">
                  <span>
                    #{row.rank} {shortAddress(row.address)}
                  </span>
                  <span>
                    {formatAmount(row.amount)} {detail.rewardToken ? "tokens" : "BNB"}
                    {row.claimed ? " ✓" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-pump-muted">No winners recorded yet.</p>
          )
        ) : onchainUnlocked ? (
          leaderboard.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {leaderboard.map((row) => (
                <li key={row.address} className="flex justify-between text-sm">
                  <span>
                    #{row.rank} {shortAddress(row.address)}
                    {address && row.address.toLowerCase() === address.toLowerCase() ? " (you)" : ""}
                  </span>
                  <span>{formatAmount(row.holdAmount)} tokens</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body-sm text-pump-muted">
              No qualified holders yet — meet min hold / min buy to appear here.
            </p>
          )
        ) : null}
      </section>

      {userAlreadyClaimed && userWinner ? (
        <div className="rounded-xl border border-pump-accent/30 bg-pump-accent/5 p-4">
          <p className="text-sm text-pump-accent">
            Reward claimed — {formatAmount(userWinner.amount)}{" "}
            {detail.rewardToken ? "tokens" : "BNB"} sent to your wallet.
          </p>
        </div>
      ) : claimInfo && detail.onChainId ? (
        <div className="rounded-xl border border-pump-accent/30 bg-pump-accent/5 p-4">
          <p className="text-sm text-pump-text">
            You won {formatAmount(claimInfo.amount)} {detail.rewardToken ? "tokens" : "BNB"}
          </p>
          <button type="button" className="btn-primary mt-3" disabled={isPending} onClick={onClaim}>
            {isPending ? "Claiming…" : "Claim reward"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
