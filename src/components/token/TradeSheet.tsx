"use client";

import { useEffect } from "react";
import { TradePanel, type TradeConfirmedPayload } from "@/components/token/TradePanel";
import type { TradePrefillConfig } from "@/lib/token-trade-prefill";

type TradeSheetProps = {
  open: boolean;
  onClose: () => void;
  tokenAddress: `0x${string}`;
  symbol: string;
  status: string;
  reserveBnb?: string;
  prefill?: TradePrefillConfig | null;
  onTradeConfirmed?: (payload: TradeConfirmedPayload) => void;
};

export function TradeSheet({
  open,
  onClose,
  tokenAddress,
  symbol,
  status,
  reserveBnb,
  prefill = null,
  onTradeConfirmed,
}: TradeSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Trade ${symbol}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close trade panel"
        onClick={onClose}
      />
      <div className="relative w-full max-h-[92dvh] overflow-hidden rounded-t-2xl border-t border-pump-border/25 bg-pump-bg shadow-panelDark">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-pump-border/50" aria-hidden />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-1">
          <h2 className="text-body font-semibold text-pump-text">Trade ${symbol}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-pump-muted transition hover:bg-pump-surface/80 hover:text-pump-text"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="max-h-[calc(92dvh-4.5rem)] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TradePanel
            embedded
            tokenAddress={tokenAddress}
            symbol={symbol}
            status={status}
            reserveBnb={reserveBnb}
            prefill={prefill}
            onTradeConfirmed={onTradeConfirmed}
          />
        </div>
      </div>
    </div>
  );
}
