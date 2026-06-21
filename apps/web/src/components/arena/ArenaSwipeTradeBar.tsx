"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { dismissHoldingsSwipeHint } from "@/components/portfolio/HoldingSwipeRow";
import { ICON_STROKE } from "@/lib/icons";
import {
  ARENA_QUICK_TRADE_CHANGE_EVENT,
  DEFAULT_ARENA_QUICK_TRADE,
  readArenaQuickTradePrefs,
  writeArenaQuickTradePrefs,
  type ArenaQuickTradePrefs,
} from "@/lib/arena-quick-trade";

export function ArenaSwipeTradeBar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState<ArenaQuickTradePrefs>(DEFAULT_ARENA_QUICK_TRADE);
  const [draftBuy, setDraftBuy] = useState(DEFAULT_ARENA_QUICK_TRADE.buyAmountBnb);
  const [draftSellPct, setDraftSellPct] = useState(String(DEFAULT_ARENA_QUICK_TRADE.sellPercent));

  const syncPrefs = useCallback(() => {
    const next = readArenaQuickTradePrefs();
    setPrefs(next);
    setDraftBuy(next.buyAmountBnb);
    setDraftSellPct(String(next.sellPercent));
  }, []);

  useEffect(() => {
    syncPrefs();

    const onChange = () => syncPrefs();
    window.addEventListener(ARENA_QUICK_TRADE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(ARENA_QUICK_TRADE_CHANGE_EVENT, onChange);
  }, [syncPrefs]);

  const openSettings = () => {
    syncPrefs();
    setSettingsOpen((open) => !open);
  };

  const saveSettings = () => {
    const sellPercent = Number(draftSellPct);
    writeArenaQuickTradePrefs({
      buyAmountBnb: draftBuy,
      sellPercent: Number.isFinite(sellPercent) ? sellPercent : DEFAULT_ARENA_QUICK_TRADE.sellPercent,
    });
    setSettingsOpen(false);
    dismissHoldingsSwipeHint();
  };

  return (
    <div className="relative shrink-0">
      <div className="flex items-center gap-2">
        <p className="text-caption leading-snug text-pump-muted">
          <span className="hidden lg:inline text-pump-muted">Quick trade: </span>
          <span className="font-medium text-pump-success">
            <span className="hidden lg:inline">Buy </span>
            {prefs.buyAmountBnb}
            <span className="hidden lg:inline"> BNB</span>
          </span>
          <span className="text-pump-muted/45"> · </span>
          <span className="font-medium text-pump-danger">
            <span className="hidden lg:inline">Sell </span>
            {prefs.sellPercent}%
          </span>
        </p>
        <button
          type="button"
          onClick={openSettings}
          className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-caption font-semibold text-pump-muted transition hover:bg-pump-border/10 hover:text-pump-text lg:h-8 lg:px-2.5 ${
            settingsOpen ? "bg-pump-border/10 text-pump-text" : ""
          }`}
          aria-label="Quick trade settings"
          aria-expanded={settingsOpen}
        >
          <Settings2 className="size-3.5" strokeWidth={ICON_STROKE} aria-hidden />
          <span className="hidden lg:inline">Settings</span>
        </button>
      </div>

      {settingsOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-2rem,18rem)] space-y-2 rounded-md border border-pump-border/25 bg-pump-card p-3 shadow-lg lg:w-72">
            <p className="text-caption font-medium text-pump-text">Quick trade amounts</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <label className="space-y-1">
                <span className="field-label text-[10px]">Buy amount (BNB)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftBuy}
                  onChange={(event) => setDraftBuy(event.target.value)}
                  className="field-input h-8 w-full py-1 text-caption"
                  placeholder="0.01"
                />
              </label>
              <label className="space-y-1">
                <span className="field-label text-[10px]">Sell (% of balance)</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={draftSellPct}
                  onChange={(event) => setDraftSellPct(event.target.value)}
                  className="field-input h-8 w-full py-1 text-caption"
                  placeholder="50"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="secondary-button h-8 px-3 text-caption"
              >
                Cancel
              </button>
              <button type="button" onClick={saveSettings} className="primary-button h-8 px-3 text-caption">
                Save
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
