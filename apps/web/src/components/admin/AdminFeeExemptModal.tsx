"use client";

import { Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AdminBtn } from "@/components/admin/AdminChrome";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { adminFetch } from "@/lib/admin-api-client";
import { ADMIN_COPY } from "@/lib/admin/copy";
import type { FeeExemptListEntry } from "@/lib/admin/fee-exempt-list";
import { contracts, explorerAddressUrl, pumpChain, shortAddress } from "@/config/chain";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";

type AdminFeeExemptModalProps = {
  open: boolean;
  onClose: () => void;
};

type TxFlow = {
  account: string;
  exempt: boolean;
  targetMeme: boolean;
  targetAirdrop: boolean;
  step: "meme" | "airdrop" | null;
};

export function AdminFeeExemptModal({ open, onClose }: AdminFeeExemptModalProps) {
  const [account, setAccount] = useState("");
  const [exempt, setExempt] = useState(true);
  const [targetMeme, setTargetMeme] = useState(true);
  const [targetAirdrop, setTargetAirdrop] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [txFlow, setTxFlow] = useState<TxFlow | null>(null);

  const [entries, setEntries] = useState<FeeExemptListEntry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [revokingAddress, setRevokingAddress] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const saving = isPending || isConfirming;

  const loadEntries = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminFetch("/api/admin/fee-exempt", { cache: "no-store" });
      const json = (await res.json()) as {
        data?: { entries: FeeExemptListEntry[] };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load exemptions");
      setEntries(json.data?.entries ?? []);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to load exemptions");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setAccount("");
    setExempt(true);
    setTargetMeme(true);
    setTargetAirdrop(Boolean(contracts.airdropManager));
    setLocalError(null);
    setTxFlow(null);
    setRevokingAddress(null);
    reset();
    void loadEntries();
  }, [open, reset, loadEntries]);

  useEffect(() => {
    if (!writeError) return;
    setLocalError(writeError.message.split("\n")[0] ?? "Transaction failed");
    setTxFlow(null);
    setRevokingAddress(null);
  }, [writeError]);

  useEffect(() => {
    if (!isSuccess || !txFlow?.step) return;

    const { account: flowAccount, exempt: flowExempt, targetMeme: flowMeme, targetAirdrop: flowAirdrop, step } =
      txFlow;

    if (step === "meme" && flowAirdrop && contracts.airdropManager) {
      setTxFlow({ ...txFlow, step: "airdrop" });
      reset();
      writeContract({
        address: contracts.airdropManager,
        abi: pumpAirdropManagerAbi,
        functionName: "setFeeExempt",
        args: [flowAccount as `0x${string}`, flowExempt],
        chainId: pumpChain.id,
      });
      return;
    }

    setTxFlow(null);
    setRevokingAddress(null);
    void loadEntries();
    if (!flowExempt) return;
    onClose();
  }, [isSuccess, txFlow, reset, writeContract, loadEntries, onClose]);

  function startTxFlow(
    flowAccount: string,
    flowExempt: boolean,
    flowTargetMeme: boolean,
    flowTargetAirdrop: boolean
  ) {
    setLocalError(null);

    if (flowTargetMeme) {
      setTxFlow({
        account: flowAccount,
        exempt: flowExempt,
        targetMeme: flowTargetMeme,
        targetAirdrop: flowTargetAirdrop,
        step: "meme",
      });
      writeContract({
        address: contracts.memeFactory,
        abi: memeFactoryAbi,
        functionName: "setFeeExempt",
        args: [flowAccount as `0x${string}`, flowExempt],
        chainId: pumpChain.id,
      });
      return;
    }

    if (!contracts.airdropManager) {
      setLocalError("Airdrop manager is not configured.");
      return;
    }

    setTxFlow({
      account: flowAccount,
      exempt: flowExempt,
      targetMeme: false,
      targetAirdrop: flowTargetAirdrop,
      step: "airdrop",
    });
    writeContract({
      address: contracts.airdropManager,
      abi: pumpAirdropManagerAbi,
      functionName: "setFeeExempt",
      args: [flowAccount as `0x${string}`, flowExempt],
      chainId: pumpChain.id,
    });
  }

  function handleSubmit() {
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

    startTxFlow(trimmed, exempt, targetMeme, targetAirdrop);
  }

  function revokeEntry(entry: FeeExemptListEntry) {
    if (saving) return;
    setRevokingAddress(entry.address);
    startTxFlow(entry.address, false, entry.meme, entry.airdrop);
  }

  if (!open) return null;

  return (
    <ModalPortal open={open}>
      <div
        className="modal-backdrop modal-backdrop-shell z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-fee-exempt-title"
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
          aria-label={ADMIN_COPY.actions.close}
          onClick={onClose}
        />
        <div className="admin-page admin-modal admin-fee-exempt-modal relative z-10">
          <div className="admin-modal-head">
            <span id="admin-fee-exempt-title">{ADMIN_COPY.feeExempt.title}</span>
            <button type="button" className="admin-icon-btn" aria-label={ADMIN_COPY.actions.close} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="admin-modal-body">
            <section className="admin-fee-exempt-section">
              <div className="admin-fee-exempt-section-head">
                <h3 className="admin-fee-exempt-section-title">{ADMIN_COPY.feeExempt.listTitle}</h3>
                <AdminBtn size="sm" onClick={() => void loadEntries()} disabled={listLoading || saving}>
                  {listLoading ? "…" : ADMIN_COPY.actions.refresh}
                </AdminBtn>
              </div>

              {listLoading && entries.length === 0 ? (
                <p className="admin-meta">{ADMIN_COPY.empty.loading}</p>
              ) : entries.length === 0 ? (
                <p className="admin-meta">{ADMIN_COPY.feeExempt.empty}</p>
              ) : (
                <ul className="admin-fee-exempt-list">
                  {entries.map((entry) => {
                    const busy = saving && revokingAddress === entry.address;
                    return (
                      <li key={entry.address} className="admin-fee-exempt-row">
                        <a
                          href={explorerAddressUrl(entry.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-link admin-num admin-fee-exempt-addr"
                        >
                          {shortAddress(entry.address)}
                        </a>
                        <span className="admin-fee-exempt-tags">
                          {entry.meme ? <span className="admin-pill">Meme</span> : null}
                          {entry.airdrop ? <span className="admin-pill">Airdrop</span> : null}
                        </span>
                        <button
                          type="button"
                          className="admin-fee-exempt-revoke"
                          aria-label={ADMIN_COPY.feeExempt.revoke}
                          disabled={busy || saving}
                          onClick={() => revokeEntry(entry)}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="admin-fee-exempt-section admin-fee-exempt-section--add">
              <h3 className="admin-fee-exempt-section-title">{ADMIN_COPY.feeExempt.addTitle}</h3>

              <label className="admin-compact-field">
                <span className="admin-field-label">{ADMIN_COPY.feeExempt.address}</span>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  disabled={saving}
                  placeholder="0x…"
                  className="admin-input admin-num"
                />
              </label>

              <fieldset className="admin-fee-exempt-checks">
                <legend className="admin-field-label">{ADMIN_COPY.feeExempt.applyTo}</legend>
                <label className="admin-fee-exempt-check">
                  <input
                    type="checkbox"
                    checked={targetMeme}
                    onChange={(e) => setTargetMeme(e.target.checked)}
                    disabled={saving}
                  />
                  Meme
                </label>
                <label className="admin-fee-exempt-check">
                  <input
                    type="checkbox"
                    checked={targetAirdrop}
                    onChange={(e) => setTargetAirdrop(e.target.checked)}
                    disabled={saving || !contracts.airdropManager}
                  />
                  Airdrop
                </label>
              </fieldset>

              <fieldset className="admin-fee-exempt-checks">
                <legend className="admin-field-label">{ADMIN_COPY.feeExempt.status}</legend>
                <label className="admin-fee-exempt-check">
                  <input
                    type="radio"
                    name="fee-exempt-status"
                    checked={exempt}
                    onChange={() => setExempt(true)}
                    disabled={saving}
                  />
                  {ADMIN_COPY.feeExempt.grant}
                </label>
                <label className="admin-fee-exempt-check">
                  <input
                    type="radio"
                    name="fee-exempt-status"
                    checked={!exempt}
                    onChange={() => setExempt(false)}
                    disabled={saving}
                  />
                  {ADMIN_COPY.feeExempt.revoke}
                </label>
              </fieldset>
            </section>

            {localError ? <p className="admin-alert">{localError}</p> : null}
          </div>

          <div className="admin-fee-exempt-foot">
            <AdminBtn onClick={onClose} disabled={saving}>
              {ADMIN_COPY.actions.close}
            </AdminBtn>
            <AdminBtn primary onClick={handleSubmit} disabled={saving}>
              {saving ? ADMIN_COPY.feeExempt.confirming : ADMIN_COPY.feeExempt.submit}
            </AdminBtn>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
