"use client";

type TokenTradeDockProps = {
  disabled?: boolean;
  sellLabel?: string;
  sellInsufficient?: boolean;
  onBuy: () => void;
  onSell: () => void;
};

/** Mobile trade dock — Binance-style solid Buy / Sell bar; opens TradeSheet. */
export function TokenTradeDock({
  disabled = false,
  sellLabel = "Sell",
  sellInsufficient = false,
  onBuy,
  onSell,
}: TokenTradeDockProps) {
  return (
    <div className="token-trade-dock lg:hidden" role="region" aria-label="Trade actions">
      <div className="token-trade-dock-inner">
        <div className="token-trade-dock-actions">
          <button
            type="button"
            className="token-trade-dock-btn token-trade-dock-buy"
            disabled={disabled}
            onClick={onBuy}
          >
            Buy
          </button>
          <button
            type="button"
            className={`token-trade-dock-btn token-trade-dock-sell${
              sellInsufficient ? " token-trade-dock-sell--insufficient" : ""
            }`}
            disabled={disabled}
            onClick={onSell}
            aria-label={sellInsufficient ? "Sell — insufficient balance" : "Sell"}
          >
            {sellLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
