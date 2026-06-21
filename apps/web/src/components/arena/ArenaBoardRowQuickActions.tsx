"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ARENA_QUICK_TRADE_CHANGE_EVENT,
  DEFAULT_ARENA_QUICK_TRADE,
  readArenaQuickTradePrefs,
  type ArenaQuickTradePrefs,
} from "@/lib/arena-quick-trade";

type ArenaBoardRowQuickActionsProps = {
  onBuy: () => void;
  onSell: () => void;
};

export function ArenaBoardRowQuickActions({ onBuy, onSell }: ArenaBoardRowQuickActionsProps) {
  const [prefs, setPrefs] = useState<ArenaQuickTradePrefs>(DEFAULT_ARENA_QUICK_TRADE);

  const syncPrefs = useCallback(() => {
    setPrefs(readArenaQuickTradePrefs());
  }, []);

  useEffect(() => {
    syncPrefs();
    const onChange = () => syncPrefs();
    window.addEventListener(ARENA_QUICK_TRADE_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(ARENA_QUICK_TRADE_CHANGE_EVENT, onChange);
  }, [syncPrefs]);

  return (
    <div className="arena-board-quick-actions">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onBuy();
        }}
        className="arena-board-quick-btn arena-board-quick-btn--buy"
      >
        Buy {prefs.buyAmountBnb} BNB
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSell();
        }}
        className="arena-board-quick-btn arena-board-quick-btn--sell"
      >
        Sell {prefs.sellPercent}%
      </button>
    </div>
  );
}
