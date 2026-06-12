"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther, parseEther, parseEventLogs } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { contracts, pumpChain } from "@/config/chain";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";
import { erc20Abi, maxUint256 } from "@/lib/abis/erc20";
import {
  hashAirdropRules,
  type AirdropRules,
  type AirdropSocialTaskInput,
} from "@/lib/airdrop-rules";
import type { TokenListItem } from "@/lib/db/launchpad";
import {
  defaultQualifyEndLocal,
  defaultQualifyStartLocal,
  endAfterStartOrDefault,
  formatUtcPreview,
  localDatetimeToUnix,
  minDatetimeLocal,
  QUALIFY_END_MIN_LEAD_SEC,
  QUALIFY_MIN_DURATION_SEC,
  QUALIFY_START_MIN_LEAD_SEC,
  unixToDatetimeLocal,
  userTimezoneLabel,
  validateQualifyWindow,
} from "@/lib/airdrop-datetime";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Leave headroom for create tx gas on top of escrow + fee. */
const GAS_BUFFER_BNB = parseEther("0.002");

const SOCIAL_TASK_TYPES = [
  { value: "FOLLOW_X", label: "Follow on X" },
  { value: "JOIN_TELEGRAM", label: "Join Telegram" },
  { value: "JOIN_DISCORD", label: "Join Discord" },
  { value: "VISIT_WEBSITE", label: "Visit website" },
  { value: "RETWEET_X", label: "Retweet / like on X" },
] as const;

type SocialTaskDraft = {
  key: string;
  taskType: string;
  targetUrl: string;
};

type PendingCreate = {
  linkedToken: `0x${string}`;
  rewardToken: `0x${string}`;
  rewardAmount: bigint;
  rulesHash: `0x${string}`;
  qualifyStart: bigint;
  qualifyEnd: bigint;
  value: bigint;
};

let socialKeySeq = 0;
function newSocialKey(): string {
  socialKeySeq += 1;
  return `social-${socialKeySeq}`;
}

export function CreateAirdropForm() {
  const router = useRouter();
  const handledRef = useRef<string | null>(null);
  const pendingCreateRef = useRef<PendingCreate | null>(null);
  const socialTasksRef = useRef<SocialTaskDraft[]>([]);
  const rulesRef = useRef<AirdropRules>({});

  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const [tokens, setTokens] = useState<TokenListItem[]>([]);
  const [linkedToken, setLinkedToken] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<"bnb" | "token">("bnb");
  const [rewardToken, setRewardToken] = useState("");
  const [rewardAmount, setRewardAmount] = useState("0.1");
  const [minHoldTokens, setMinHoldTokens] = useState("");
  const [minBuyBnb, setMinBuyBnb] = useState("0.01");
  const [qualifyStartLocal, setQualifyStartLocal] = useState(defaultQualifyStartLocal);
  const [qualifyEndLocal, setQualifyEndLocal] = useState(() =>
    defaultQualifyEndLocal(defaultQualifyStartLocal())
  );
  const [socialTasks, setSocialTasks] = useState<SocialTaskDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "create" | null>(null);
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { data: createFee } = useReadContract({
    address: contracts.airdropManager,
    abi: pumpAirdropManagerAbi,
    functionName: "createFee",
    query: { enabled: Boolean(contracts.airdropManager) },
  });

  const rewardTokenAddress =
    rewardType === "token" && rewardToken ? (rewardToken as `0x${string}`) : undefined;

  const { data: bnbBalance } = useBalance({
    address,
    chainId: pumpChain.id,
    query: { enabled: Boolean(address) },
  });

  const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
    address: rewardTokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address && contracts.airdropManager
        ? [address, contracts.airdropManager]
        : undefined,
    query: { enabled: Boolean(rewardTokenAddress && address && contracts.airdropManager) },
  });

  const { data: rewardTokenBalance } = useReadContract({
    address: rewardTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(rewardTokenAddress && address) },
  });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { data: receipt, isSuccess: receiptOk } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tokens");
      const json = (await res.json()) as { data?: TokenListItem[] };
      setTokens(json.data ?? []);
    })();
  }, []);

  const socialTasksForSync = useMemo((): AirdropSocialTaskInput[] => {
    return socialTasks
      .filter((t) => t.targetUrl.trim())
      .map((t, index) => ({
        taskType: t.taskType,
        targetUrl: t.targetUrl.trim(),
        isRequired: true,
        sortOrder: index,
      }));
  }, [socialTasks]);

  const rules = useMemo((): AirdropRules => {
    const onchain: AirdropRules["onchain"] = {};
    if (minHoldTokens.trim()) onchain.minHoldWei = parseEther(minHoldTokens).toString();
    if (minBuyBnb.trim()) onchain.minBuyBnbWei = parseEther(minBuyBnb).toString();
    return {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      onchain,
      social: socialTasksForSync.length > 0 ? socialTasksForSync : undefined,
    };
  }, [title, description, minHoldTokens, minBuyBnb, socialTasksForSync]);

  const rulesHash = useMemo(() => hashAirdropRules(rules), [rules]);

  socialTasksRef.current = socialTasks;
  rulesRef.current = rules;

  useEffect(() => {
    if (!receiptOk || !receipt || !address || !contracts.airdropManager) return;

    if (pendingAction === "approve") {
      setPendingAction(null);
      void refetchAllowance();
      const pending = pendingCreateRef.current;
      if (pending) {
        setPendingAction("create");
        writeContract({
          address: contracts.airdropManager,
          abi: pumpAirdropManagerAbi,
          functionName: "createAirdrop",
          args: [
            pending.linkedToken,
            pending.rewardToken,
            pending.rewardAmount,
            pending.rulesHash,
            pending.qualifyStart,
            pending.qualifyEnd,
          ],
          value: pending.value,
        });
      }
      return;
    }

    if (pendingAction !== "create") return;
    if (handledRef.current === receipt.transactionHash) return;
    handledRef.current = receipt.transactionHash;
    setPendingAction(null);
    pendingCreateRef.current = null;

    (async () => {
      try {
        const logs = parseEventLogs({
          abi: pumpAirdropManagerAbi,
          logs: receipt.logs,
          eventName: "AirdropCreated",
        });
        const created = logs[0];
        if (!created) throw new Error("AirdropCreated event not found");

        const qualifyStart = new Date(Number(created.args.qualifyStart) * 1000).toISOString();
        const qualifyEnd = new Date(Number(created.args.qualifyEnd) * 1000).toISOString();
        const claimStart = new Date(Number(created.args.claimStart) * 1000).toISOString();
        const claimEnd = new Date(Number(created.args.claimEnd) * 1000).toISOString();

        const syncRes = await fetch("/api/airdrops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onChainId: created.args.airdropId.toString(),
            creatorAddress: address,
            createTxHash: receipt.transactionHash,
            linkedToken: created.args.linkedToken,
            rewardToken: created.args.rewardToken === ZERO ? null : created.args.rewardToken,
            totalFunded: formatEther(created.args.totalFunded),
            qualifyStart,
            qualifyEnd,
            claimStart,
            claimEnd,
            rules: rulesRef.current,
            rulesHash,
            socialTasks: socialTasksRef.current
              .filter((t) => t.targetUrl.trim())
              .map((t, index) => ({
                taskType: t.taskType,
                targetUrl: t.targetUrl.trim(),
                isRequired: true,
                sortOrder: index,
              })),
          }),
        });
        const syncJson = (await syncRes.json()) as { data?: { id: string }; error?: string };
        if (!syncRes.ok) throw new Error(syncJson.error ?? "Metadata sync failed");
        const dbId = syncJson.data?.id;
        if (!dbId) throw new Error("Airdrop saved on-chain but DB sync returned no id");
        router.push(`/airdrops/${dbId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Post-create sync failed");
        reset();
        handledRef.current = null;
      }
    })();
  }, [
    receipt,
    receiptOk,
    address,
    rulesHash,
    router,
    reset,
    pendingAction,
    refetchAllowance,
    writeContract,
  ]);

  function addSocialTask() {
    setSocialTasks((prev) => [
      ...prev,
      { key: newSocialKey(), taskType: "FOLLOW_X", targetUrl: "" },
    ]);
  }

  function updateSocialTask(key: string, patch: Partial<SocialTaskDraft>) {
    setSocialTasks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function removeSocialTask(key: string) {
    setSocialTasks((prev) => prev.filter((t) => t.key !== key));
  }

  function submitCreate(pending: PendingCreate) {
    pendingCreateRef.current = pending;
    setPendingAction("create");
    writeContract({
      address: contracts.airdropManager!,
      abi: pumpAirdropManagerAbi,
      functionName: "createAirdrop",
      args: [
        pending.linkedToken,
        pending.rewardToken,
        pending.rewardAmount,
        pending.rulesHash,
        pending.qualifyStart,
        pending.qualifyEnd,
      ],
      value: pending.value,
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }
    if (!contracts.airdropManager) {
      setError("Airdrop manager not configured");
      return;
    }
    if (!linkedToken) {
      setError("Select a target token");
      return;
    }
    if (!rules.onchain?.minHoldWei && !rules.onchain?.minBuyBnbWei) {
      setError("Set at least one on-chain rule (min hold or min buy)");
      return;
    }
    if (rewardType === "token" && !rewardToken) {
      setError("Select a reward token");
      return;
    }

    const windowCheck = validateQualifyWindow(qualifyStartLocal, qualifyEndLocal);
    if (!windowCheck.ok) {
      setError(windowCheck.error);
      return;
    }
    const { startSec, endSec } = windowCheck;

    for (const task of socialTasks) {
      if (task.targetUrl.trim() && !/^https?:\/\//i.test(task.targetUrl.trim())) {
        setError("Social task URLs must start with http:// or https://");
        return;
      }
    }

    let amount: bigint;
    try {
      amount = parseEther(rewardAmount);
    } catch {
      setError("Invalid reward amount");
      return;
    }
    if (amount <= 0n) {
      setError("Reward amount must be greater than zero");
      return;
    }

    if (!formValidation.canSubmit) {
      setError(formValidation.warnings[0] ?? "Fix form errors before creating");
      return;
    }

    const fee = createFee ?? 0n;
    const qualifyStart = BigInt(startSec);
    const qualifyEnd = BigInt(endSec);

    const pending: PendingCreate = {
      linkedToken: linkedToken as `0x${string}`,
      rewardToken: rewardType === "bnb" ? ZERO : (rewardToken as `0x${string}`),
      rewardAmount: amount,
      rulesHash,
      qualifyStart,
      qualifyEnd,
      value: rewardType === "bnb" ? amount + fee : fee,
    };

    if (rewardType === "token") {
      const allowance = tokenAllowance ?? 0n;
      if (allowance < amount) {
        pendingCreateRef.current = pending;
        setPendingAction("approve");
        writeContract({
          address: rewardToken as `0x${string}`,
          abi: erc20Abi,
          functionName: "approve",
          args: [contracts.airdropManager, maxUint256],
        });
        return;
      }
    }

    submitCreate(pending);
  }

  const tzLabel = useMemo(() => userTimezoneLabel(), []);

  const startMinLocal = useMemo(
    () => minDatetimeLocal(Math.ceil(QUALIFY_START_MIN_LEAD_SEC / 60)),
    [nowTick]
  );

  const endMinLocal = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = localDatetimeToUnix(qualifyStartLocal);
    const minEndSec = Math.max(
      (Number.isFinite(startSec) ? startSec : nowSec) + QUALIFY_MIN_DURATION_SEC,
      nowSec + QUALIFY_END_MIN_LEAD_SEC
    );
    return unixToDatetimeLocal(minEndSec);
  }, [qualifyStartLocal, nowTick]);

  const qualifyDurationLabel = useMemo(() => {
    const check = validateQualifyWindow(qualifyStartLocal, qualifyEndLocal);
    if (!check.ok) return null;
    const hours = Math.round((check.endSec - check.startSec) / 3600);
    return `${hours}h qualification · claim opens at end · 24h claim window`;
  }, [qualifyStartLocal, qualifyEndLocal]);

  const startUtcPreview = formatUtcPreview(qualifyStartLocal);
  const endUtcPreview = formatUtcPreview(qualifyEndLocal);

  function handleQualifyStartChange(value: string) {
    setQualifyStartLocal(value);
    setQualifyEndLocal((prev) => endAfterStartOrDefault(value, prev));
  }

  const parsedRewardAmount = useMemo(() => {
    try {
      const value = parseEther(rewardAmount);
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }, [rewardAmount]);

  const selectedRewardSymbol = useMemo(
    () => tokens.find((t) => t.address === rewardToken)?.symbol ?? "tokens",
    [tokens, rewardToken]
  );

  const formValidation = useMemo(() => {
    const warnings: string[] = [];
    let canSubmit = true;

    if (!linkedToken) {
      warnings.push("Select a target token.");
      canSubmit = false;
    }

    if (!rules.onchain?.minHoldWei && !rules.onchain?.minBuyBnbWei) {
      warnings.push("Set at least one on-chain rule (min hold or min buy).");
      canSubmit = false;
    }

    if (rewardType === "token" && !rewardToken) {
      warnings.push("Select a reward token.");
      canSubmit = false;
    }

    if (!parsedRewardAmount) {
      warnings.push("Enter a valid reward amount greater than zero.");
      canSubmit = false;
    }

    const windowCheck = validateQualifyWindow(qualifyStartLocal, qualifyEndLocal);
    if (!windowCheck.ok) {
      warnings.push(windowCheck.error);
      canSubmit = false;
    }

    for (const task of socialTasks) {
      if (task.targetUrl.trim() && !/^https?:\/\//i.test(task.targetUrl.trim())) {
        warnings.push("Social task URLs must start with http:// or https://");
        canSubmit = false;
        break;
      }
    }

    if (!isConnected) {
      canSubmit = false;
    }

    const fee = createFee ?? 0n;

    if (isConnected && parsedRewardAmount) {
      const bnbAvail = bnbBalance?.value ?? 0n;

      if (rewardType === "bnb") {
        const neededBnb = parsedRewardAmount + fee + GAS_BUFFER_BNB;
        if (bnbAvail < neededBnb) {
          warnings.push(
            `Insufficient BNB: need ${formatEther(neededBnb)} (reward + ${formatEther(fee)} fee + gas), wallet has ${formatEther(bnbAvail)}.`
          );
          canSubmit = false;
        }
      } else if (rewardToken) {
        const neededBnb = fee + GAS_BUFFER_BNB;
        if (bnbAvail < neededBnb) {
          warnings.push(
            `Insufficient BNB for create fee: need ${formatEther(neededBnb)} (${formatEther(fee)} fee + gas), wallet has ${formatEther(bnbAvail)}.`
          );
          canSubmit = false;
        }

        const tokenAvail = rewardTokenBalance ?? 0n;
        if (tokenAvail < parsedRewardAmount) {
          warnings.push(
            `Insufficient ${selectedRewardSymbol}: need ${formatEther(parsedRewardAmount)}, wallet has ${formatEther(tokenAvail)}.`
          );
          canSubmit = false;
        }
      }
    }

    return { warnings, canSubmit };
  }, [
    linkedToken,
    rules.onchain?.minHoldWei,
    rules.onchain?.minBuyBnbWei,
    rewardType,
    rewardToken,
    parsedRewardAmount,
    qualifyStartLocal,
    qualifyEndLocal,
    socialTasks,
    isConnected,
    createFee,
    bnbBalance?.value,
    rewardTokenBalance,
    selectedRewardSymbol,
  ]);

  if (!contracts.airdropManager) {
    return <p className="text-body-sm text-pump-danger">NEXT_PUBLIC_AIRDROP_MANAGER is not set.</p>;
  }

  const busy = isPending || Boolean(txHash && !error);
  const submitDisabled = busy || !formValidation.canSubmit;

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-pump-border/30 bg-pump-surface/40 p-4">
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-pump-text">1. Target token</h3>
        <select
          className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
          value={linkedToken}
          onChange={(e) => setLinkedToken(e.target.value)}
        >
          <option value="">Select token</option>
          {tokens.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol} — {t.name}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-pump-text">2. Campaign info</h3>
        <input
          className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
          placeholder="Campaign title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
          rows={3}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-pump-text">3. Reward pool</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-body-sm text-pump-muted">Reward type</span>
            <select
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={rewardType}
              onChange={(e) => setRewardType(e.target.value as "bnb" | "token")}
            >
              <option value="bnb">BNB (native)</option>
              <option value="token">Platform token (launchpad)</option>
            </select>
          </label>
          {rewardType === "token" ? (
            <label className="block space-y-1">
              <span className="text-body-sm text-pump-muted">Reward token</span>
              <select
                className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
                value={rewardToken}
                onChange={(e) => setRewardToken(e.target.value)}
              >
                <option value="">Select reward token</option>
                {tokens.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={`block space-y-1 ${rewardType === "bnb" ? "sm:col-span-2" : ""}`}>
            <span className="text-body-sm text-pump-muted">
              Total reward amount ({rewardType === "bnb" ? "BNB" : "tokens"})
            </span>
            <input
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
            />
          </label>
        </div>
        {isConnected && bnbBalance ? (
          <p className="text-xs text-pump-muted">
            Wallet BNB: {formatEther(bnbBalance.value)}
            {rewardType === "token" && rewardTokenBalance !== undefined && rewardToken
              ? ` · ${selectedRewardSymbol}: ${formatEther(rewardTokenBalance)}`
              : ""}
          </p>
        ) : null}
        {rewardType === "token" ? (
          <p className="text-xs text-pump-muted">
            Token rewards require approval, plus {createFee !== undefined ? formatEther(createFee) : "…"} BNB create fee.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-pump-text">4. Qualification window</h3>
        <p className="text-xs text-pump-muted">
          Times are in your local timezone ({tzLabel}). On-chain and database store UTC (Unix timestamp /
          timestamptz). Past times cannot be selected.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-body-sm text-pump-muted">Start (local)</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={qualifyStartLocal}
              min={startMinLocal}
              onChange={(e) => handleQualifyStartChange(e.target.value)}
            />
            {startUtcPreview ? (
              <span className="text-xs text-pump-muted">On-chain: {startUtcPreview}</span>
            ) : null}
          </label>
          <label className="block space-y-1">
            <span className="text-body-sm text-pump-muted">End (local)</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={qualifyEndLocal}
              min={endMinLocal}
              onChange={(e) => setQualifyEndLocal(e.target.value)}
            />
            {endUtcPreview ? (
              <span className="text-xs text-pump-muted">On-chain: {endUtcPreview}</span>
            ) : null}
          </label>
        </div>
        {qualifyDurationLabel ? (
          <p className="text-xs text-pump-muted">{qualifyDurationLabel}</p>
        ) : (
          <p className="text-xs text-pump-warning">
            End must be at least 15 minutes after start and in the future.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-pump-text">5. On-chain rules (at least one)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-body-sm text-pump-muted">Min hold (tokens)</span>
            <input
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={minHoldTokens}
              onChange={(e) => setMinHoldTokens(e.target.value)}
              placeholder="e.g. 1000"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-body-sm text-pump-muted">Min buy (BNB)</span>
            <input
              className="w-full rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
              value={minBuyBnb}
              onChange={(e) => setMinBuyBnb(e.target.value)}
              placeholder="e.g. 0.01"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-pump-text">6. Social tasks (optional)</h3>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={addSocialTask}
          >
            + Add task
          </button>
        </div>
        {socialTasks.length === 0 ? (
          <p className="text-body-sm text-pump-muted">
            No social gate — on-chain rules unlock immediately for everyone.
          </p>
        ) : (
          <ul className="space-y-2">
            {socialTasks.map((task, index) => (
              <li
                key={task.key}
                className="grid gap-2 rounded-lg border border-pump-border/25 bg-pump-bg/40 p-3 sm:grid-cols-[minmax(0,9rem)_1fr_auto]"
              >
                <select
                  className="rounded-lg border border-pump-border/40 bg-pump-bg px-2 py-2 text-sm"
                  value={task.taskType}
                  onChange={(e) => updateSocialTask(task.key, { taskType: e.target.value })}
                >
                  {SOCIAL_TASK_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border border-pump-border/40 bg-pump-bg px-3 py-2 text-sm"
                  placeholder="https://..."
                  value={task.targetUrl}
                  onChange={(e) => updateSocialTask(task.key, { targetUrl: e.target.value })}
                />
                <button
                  type="button"
                  className="text-sm text-pump-muted hover:text-pump-danger"
                  onClick={() => removeSocialTask(task.key)}
                  aria-label={`Remove task ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-pump-muted">
        Fixed TOP 100 distribution. Create fee: {createFee !== undefined ? formatEther(createFee) : "…"} BNB. No cancel after deposit.
      </p>

      {error ? <p className="text-body-sm text-pump-danger">{error}</p> : null}

      {formValidation.warnings.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-pump-warning/30 bg-pump-warning/5 px-3 py-2">
          {formValidation.warnings.map((warning) => (
            <li key={warning} className="text-body-sm text-pump-warning">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <button type="submit" disabled={submitDisabled} className="btn-primary w-full">
        {!isConnected
          ? "Connect wallet"
          : pendingAction === "approve"
            ? "Approving token…"
            : busy
              ? "Creating…"
              : "Create airdrop"}
      </button>
    </form>
  );
}
