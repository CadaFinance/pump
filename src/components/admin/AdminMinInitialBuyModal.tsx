"use client";

import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { MAX_MIN_INITIAL_BUY_BNB } from "@/lib/platform-settings";

type AdminMinInitialBuyModalProps = {
  open: boolean;
  onClose: () => void;
  currentMinBnb: string;
  adminAddress: string;
  onUpdated: () => void;
};

export function AdminMinInitialBuyModal({
  open,
  onClose,
  currentMinBnb,
  adminAddress,
  onUpdated,
}: AdminMinInitialBuyModalProps) {
  const [bnbInput, setBnbInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBnbInput(currentMinBnb);
    setLocalError(null);
  }, [open, currentMinBnb]);

  if (!open) return null;

  async function handleSubmit() {
    setLocalError(null);
    setSaving(true);

    try {
      const res = await fetch(
        `/api/admin/platform-settings?address=${encodeURIComponent(adminAddress)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minInitialBuyBnb: bnbInput.trim() }),
        }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update setting");
      }

      onUpdated();
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal open={open}>
      <div
        className="modal-backdrop modal-backdrop-shell z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-min-initial-buy-title"
      >
        <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
        <div className="panel-surface relative w-full max-w-md p-5 shadow-panel">
          <h2 id="admin-min-initial-buy-title" className="text-h2 font-semibold text-pump-text">
            Minimum initial buy
          </h2>
          <p className="mt-1 text-sm text-pump-muted">
            Off-chain UI rule for the create page. Creators must buy at least this much BNB on
            launch (in addition to the meme launch fee). Not enforced on-chain.
          </p>

          <div className="mt-4 rounded-md border border-pump-border/15 bg-pump-surface/35 px-3 py-2.5">
            <p className="section-label">Current value</p>
            <p className="financial-value mt-1 text-body-sm font-semibold text-pump-text">
              {currentMinBnb} BNB
            </p>
          </div>

          <label className="mt-4 block">
            <span className="section-label">New minimum (BNB)</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.01"
              value={bnbInput}
              onChange={(e) => setBnbInput(e.target.value)}
              disabled={saving}
              className="field-input mt-2 h-10 w-full bg-pump-bg/80"
            />
          </label>

          <p className="mt-2 text-caption text-pump-muted">
            Must be &gt; 0 and ≤ {MAX_MIN_INITIAL_BUY_BNB} BNB. Takes effect immediately on the
            create page.
          </p>

          {localError ? <p className="notice-error mt-3">{localError}</p> : null}

          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onClose} className="secondary-button flex-1 py-2.5">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="primary-button flex-1 py-2.5"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
