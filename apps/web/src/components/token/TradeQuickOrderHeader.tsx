"use client";

type TradeQuickOrderSide = "buy" | "sell";

type TradeQuickOrderHeaderProps = {
  symbol: string;
  changePct?: number | null;
  side: TradeQuickOrderSide;
  onSideChange: (side: TradeQuickOrderSide) => void;
  onClose: () => void;
};

function formatChangePct(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  return `${pct >= 0 && pct !== 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function changeBadgeClass(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct) || pct === 0) {
    return "trade-quick-order-header__change";
  }
  return pct > 0
    ? "trade-quick-order-header__change trade-quick-order-header__change--up"
    : "trade-quick-order-header__change trade-quick-order-header__change--down";
}

export function TradeQuickOrderHeader({
  symbol,
  changePct = null,
  side,
  onSideChange,
  onClose,
}: TradeQuickOrderHeaderProps) {
  return (
    <header className="trade-quick-order-header">
      <div className="trade-quick-order-header__top">
        <h2 className="trade-quick-order-header__title">Quick Order</h2>
        <button
          type="button"
          onClick={onClose}
          className="trade-quick-order-header__close"
          aria-label="Close"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className="trade-quick-order-header__meta">
        <div className="trade-quick-order-header__pair-row">
          <span className="trade-quick-order-header__pair financial-value">{symbol}/USD</span>
          <span className={changeBadgeClass(changePct)}>{formatChangePct(changePct)}</span>
        </div>

        <div className="trade-quick-order-header__side-toggle" role="tablist" aria-label="Trade side">
          <button
            type="button"
            role="tab"
            aria-selected={side === "buy"}
            className={
              side === "buy"
                ? "trade-quick-order-header__side-btn trade-quick-order-header__side-btn--buy-active"
                : "trade-quick-order-header__side-btn"
            }
            onClick={() => onSideChange("buy")}
          >
            Buy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={side === "sell"}
            className={
              side === "sell"
                ? "trade-quick-order-header__side-btn trade-quick-order-header__side-btn--sell-active"
                : "trade-quick-order-header__side-btn"
            }
            onClick={() => onSideChange("sell")}
          >
            Sell
          </button>
        </div>
      </div>
    </header>
  );
}
