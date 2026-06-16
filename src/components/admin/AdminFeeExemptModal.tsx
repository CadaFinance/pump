"use client";

import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { contracts, pumpChain } from "@/config/chain";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";

type AdminFeeExemptModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminFeeExemptModal({ open, onClose }: AdminFeeExemptModalProps) {
  const [account, setAccount] = useState("");
  const [exempt, setExempt] = useState(true);
  const [targetMeme, setTargetMeme] = useState(true);
  const [targetAirdrop, setTargetAirdrop] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<"meme" | "airdrop" | null>(null);

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!open) return;
    setAccount("");
    setExempt(true);
    setTargetMeme(true);
    setTargetAirdrop(Boolean(contracts.airdropManager));
    setLocalError(null);
    setStep(null);
    reset();
  }, [open, reset]);

  useEffect(() => {
    if (!writeError) return;
    setLocalError(writeError.message.split("\n")[0] ?? "Transaction failed");
    setStep(null);
  }, [writeError]);

  useEffect(() => {
    if (!isSuccess || !step) return;

    if (step === "meme" && targetAirdrop && contracts.airdropManager) {
      setStep("airdrop");
      reset();
      writeContract({
        address: contracts.airdropManager,
        abi: pumpAirdropManagerAbi,
        functionName: "setFeeExempt",
        args: [account as `0x${string}`, exempt],
        chainId: pumpChain.id,
      });
      return;
    }

    onClose();
  }, [isSuccess, step, targetAirdrop, account, exempt, reset, writeContract, onClose]);

  if (!open) return null;

  const saving = isPending || isConfirming;

  function handleSubmit() {
    setLocalError(null);

    const trimmed = account.trim();
    if (!isAddress(trimmed)) {
      setLocalError("Enter a valid wallet address.");
      return;
    }
    if (!targetMeme && !targetAirdrop) {
      setLocalError("Select at least one contract.");
      return;
    }
    if (targetAirdrop && !contracts.airdropManager) {
      setLocalError("Airdrop manager is not configured.");
      return;
    }

    if (targetMeme) {
      setStep("meme");
      writeContract({
        address: contracts.memeFactory,
        abi: memeFactoryAbi,
        functionName: "setFeeExempt",
        args: [trimmed as `0x${string}`, exempt],
        chainId: pumpChain.id,
      });
      return;
    }

    setStep("airdrop");
    writeContract({
      address: contracts.airdropManager!,
      abi: pumpAirdropManagerAbi,
      functionName: "setFeeExempt",
      args: [trimmed as `0x${string}`, exempt],
      chainId: pumpChain.id,
    });
  }

  return (
    <ModalPortal open={open}>
      <div
        className="modal-backdrop modal-backdrop-shell z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-fee-exempt-title"
      >
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
        <div className="panel-surface relative w-full max-w-md p-5 shadow-panel">
          <h2 id="admin-fee-exempt-title" className="text-h2 font-semibold text-pump-text">
            Fee exemption
          </h2>
          <p className="mt-1 text-sm text-pump-muted">
            On-chain via MemeFactory and PumpAirdropManager. Exempt addresses pay 0 create fee
            (owner is always free).
          </p>

          <label className="mt-4 block">
            <span className="section-label">Wallet address</span>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              disabled={saving}
              placeholder="0x…"
              className="field-input mt-2 h-10 w-full bg-pump-bg/80"
            />
          </label>

          <fieldset className="mt-4 space-y-2">
            <legend className="section-label">Apply to</legend>
            <label className="flex items-center gap-2 text-body-sm text-pump-text">
              <input
                type="checkbox"
                checked={targetMeme}
                onChange={(e) => setTargetMeme(e.target.checked)}
                disabled={saving}
              />
              Meme launch create fee
            </label>
            <label className="flex items-center gap-2 text-body-sm text-pump-text">
              <input
                type="checkbox"
                checked={targetAirdrop}
                onChange={(e) => setTargetAirdrop(e.target.checked)}
                disabled={saving || !contracts.airdropManager}
              />
              Airdrop create fee
            </label>
          </fieldset>

          <fieldset className="mt-4 flex gap-4">
            <legend className="section-label mb-2 w-full">Status</legend>
            <label className="flex items-center gap-2 text-body-sm text-pump-text">
              <input
                type="radio"
                name="fee-exempt-status"
                checked={exempt}
                onChange={() => setExempt(true)}
                disabled={saving}
              />
              Grant exempt
            </label>
            <label className="flex items-center gap-2 text-body-sm text-pump-text">
              <input
                type="radio"
                name="fee-exempt-status"
                checked={!exempt}
                onChange={() => setExempt(false)}
                disabled={saving}
              />
              Revoke exempt
            </label>
          </fieldset>

          {localError ? <p className="notice-error mt-3">{localError}</p> : null}

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onClose} className="secondary-button flex-1 py-2.5">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit()}
              className="primary-button flex-1 py-2.5"
            >
              {saving ? "Confirming…" : "Update on-chain"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
