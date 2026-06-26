"use client";

import { explorerTxUrl } from "@/config/chain";
import {
  pendingOrderPhaseLabel,
  type TradePendingOrder,
} from "@/lib/trade-pending-orders";

type TradePendingOrdersStripProps = {
  orders: TradePendingOrder[];
  symbol: string;
};

function sideLabel(side: TradePendingOrder["side"], tokenSymbol: string): string {
  return side === "buy" ? "Buy" : `Sell ${tokenSymbol}`;
}

export function TradePendingOrdersStrip({ orders, symbol }: TradePendingOrdersStripProps) {
  if (orders.length === 0) return null;

  const headline =
    orders.length === 1
      ? "1 open order"
      : `${orders.length} open orders`;

  return (
    <div className="trade-pending-orders mx-4 mb-3" role="status" aria-live="polite">
      <div className="trade-pending-orders__header">
        <span className="trade-pending-orders__title">{headline}</span>
        <span className="trade-pending-orders__hint">Settling on-chain</span>
      </div>
      <ul className="trade-pending-orders__list">
        {orders.map((order) => {
          const txUrl = order.txHash ? explorerTxUrl(order.txHash) : null;
          return (
            <li key={order.id} className="trade-pending-orders__row">
              <span
                className={`trade-pending-orders__side trade-pending-orders__side--${order.side}`}
              >
                {sideLabel(order.side, symbol)}
              </span>
              <span className="trade-pending-orders__phase">
                {pendingOrderPhaseLabel(order.phase)}
              </span>
              {txUrl ? (
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trade-pending-orders__tx-link"
                >
                  View tx
                </a>
              ) : (
                <span className="trade-pending-orders__tx-placeholder" aria-hidden>
                  ···
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
