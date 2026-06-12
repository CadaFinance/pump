"use client";

import { formatEther } from "viem";
import { useEffect, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { contracts, pumpChain } from "@/config/chain";
import { useBnbUsdPrice } from "@/hooks/useBnbUsdPrice";
import { bondingCurveManagerAbi } from "@/lib/bonding-curve";
import { bnbToUsd, formatUsdReadable } from "@/lib/format-usd";

type ClaimCreatorFeesModalProps = {
  open: boolean;
  onClose: () => void;
  claimedBnb: number;
  onClaimed: () => void;
};

function formatFeeBnb(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 0.0001) return value.toFixed(6);
  return value.toFixed(8);
}

async function recordClaimInDb(txHash: string, creatorAddress: string): Promise<void> {
  const res = await fetch("/api/portfolio/creator-fees/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, creatorAddress }),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to record claim");
  }
}

export function ClaimCreatorFeesModal({
  open,
  onClose,
  claimedBnb,
  onClaimed,
}: ClaimCreatorFeesModalProps) {
  const { bnbUsd } = useBnbUsdPrice();
  const { address, chain } = useAccount();

  const { data: pendingWei, refetch: refetchPending } = useReadContract({
    address: contracts.bondingCurveManager,
    abi: bondingCurveManagerAbi,
    functionName: "pendingCreatorFees",
    args: address ? [address] : undefined,
    chainId: pumpChain.id,
    query: { enabled: open && Boolean(address), refetchInterval: open ? 5_000 : false },
  });

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const handledTxRef = useRef<string | null>(null);

  const pendingBnb = pendingWei != null ? Number(formatEther(pendingWei)) : 0;
  const totalBnb = claimedBnb + pendingBnb;
  const pendingUsd = bnbToUsd(pendingBnb, bnbUsd);
  const claimedUsd = bnbToUsd(claimedBnb, bnbUsd);
  const totalUsd = bnbToUsd(totalBnb, bnbUsd);
  const wrongChain = chain?.id !== pumpChain.id;
  const canClaim = pendingBnb > 0 && !wrongChain && !isPending && !isConfirming;

  useEffect(() => {
    if (!isSuccess || !txHash || !address) return;
    if (handledTxRef.current === txHash) return;
    handledTxRef.current = txHash;

    void (async () => {
      try {
        await recordClaimInDb(txHash, address);
      } catch (err) {
        console.warn("[claim] DB record failed, indexer may catch up:", err);
      }
      await refetchPending();
      onClaimed();
      reset();
      onClose();
    })();
  }, [isSuccess, txHash, address, onClaimed, onClose, refetchPending, reset]);

  if (!open) return null;

  async function handleClaim() {
    if (!canClaim) return;
    writeContract({
      address: contracts.bondingCurveManager,
      abi: bondingCurveManagerAbi,
      functionName: "claimCreatorFees",
      chainId: pumpChain.id,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-creator-fees-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="panel-surface relative w-full max-w-md p-5 shadow-panel">
        <h2 id="claim-creator-fees-title" className="text-h2 font-semibold text-pump-text">
          Claim creator fees
        </h2>
        <p className="mt-1 text-sm text-pump-muted">
          Unclaimed fees sit on the bonding curve contract until you claim them to your wallet.
        </p>

        <div className="mt-5 rounded-md border border-pump-accent/25 bg-pump-accent/10 p-4">
          <p className="section-label">Available to claim</p>
          <p className="financial-value mt-1 text-h1 font-semibold text-pump-accent">
            {formatUsdReadable(pendingUsd, { compact: true })}
          </p>
          <p className="mt-0.5 text-caption text-pump-muted">{formatFeeBnb(pendingBnb)} BNB</p>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-pump-muted">Previously claimed</dt>
            <dd className="text-right">
              <span className="financial-value text-pump-text">
                {formatUsdReadable(claimedUsd, { compact: true })}
              </span>
              <span className="mt-0.5 block text-caption text-pump-muted">
                {formatFeeBnb(claimedBnb)} BNB
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-pump-border/20 pt-2">
            <dt className="text-pump-muted">Lifetime total</dt>
            <dd className="text-right">
              <span className="financial-value font-medium text-pump-text">
                {formatUsdReadable(totalUsd, { compact: true })}
              </span>
              <span className="mt-0.5 block text-caption text-pump-muted">
                {formatFeeBnb(totalBnb)} BNB
              </span>
            </dd>
          </div>
        </dl>

        {wrongChain ? (
          <p className="mt-4 text-sm text-pump-warning">Switch to BSC Testnet to claim.</p>
        ) : null}

        {writeError ? (
          <p className="notice-error mt-4">
            {writeError.message.split("\n")[0]}
          </p>
        ) : null}

        {txHash ? (
          <p className="mt-3 break-all text-xs text-pump-muted">
            Tx: {txHash.slice(0, 10)}…{isConfirming ? " confirming…" : isSuccess ? " saving…" : ""}
          </p>
        ) : null}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="secondary-button flex-1 py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canClaim}
            onClick={() => void handleClaim()}
            className="primary-button flex-1 py-2.5"
          >
            {isPending || isConfirming ? "Claiming…" : pendingBnb > 0 ? "Claim" : "Nothing to claim"}
          </button>
        </div>
      </div>
    </div>
  );
}
