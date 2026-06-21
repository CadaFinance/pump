"use client";

import { useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";

type TradeConfirmModalProps = {
  open: boolean;
  side: "buy" | "sell";
  symbol: string;
  spendLabel: string;
  receiveLabel: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (rememberSession: boolean) => void;
};

export function TradeConfirmModal({
  open,
  side,
  symbol,
  spendLabel,
  receiveLabel,
  loading,
  error,
  onClose,
  onConfirm,
}: TradeConfirmModalProps) {
  const [remember, setRemember] = useState(true);

  if (!open) return null;

  return (
    <ModalPortal open={open}>
      <>
        <button
          type="button"
          className="modal-backdrop modal-backdrop-dismiss z-[120] cursor-default"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          className="modal-sheet-host z-[121]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trade-confirm-title"
        >
          <div className="modal-panel modal-sheet-panel max-w-md rounded-t-2xl border-x-0 border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:border-x sm:border-b sm:p-5">
            <h2 id="trade-confirm-title" className="text-h3 font-semibold text-pump-text">
              {side === "buy" ? "Buy" : "Sell"} {symbol}
            </h2>

            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-pump-muted">You pay</dt>
                <dd className="financial-value text-body font-semibold text-pump-text">{spendLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-pump-muted">You receive</dt>
                <dd className="financial-value text-body font-semibold text-pump-text">
                  {receiveLabel}
                </dd>
              </div>
            </dl>

            {error ? <p className="notice-warning mt-3 leading-snug">{error}</p> : null}

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-caption text-pump-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0"
              />
              Don&apos;t ask again
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="secondary-button w-full"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(remember)}
                className="primary-button w-full"
                disabled={loading}
              >
                {loading ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
