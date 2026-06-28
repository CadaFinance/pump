"use client";

import { PumpIcon, faSearch } from "@/lib/icons";

const PLACEHOLDER_ROWS = [
  { symbol: "PEPE", pair: "PEPE/USDT", price: "0.000012", change: "+4.82%" },
  { symbol: "DOGE", pair: "DOGE/USDT", price: "0.182", change: "-1.24%" },
  { symbol: "WIF", pair: "WIF/USDT", price: "1.42", change: "+2.05%" },
  { symbol: "BONK", pair: "BONK/USDT", price: "0.000028", change: "-0.88%" },
  { symbol: "OG", pair: "OG/USDT", price: "0.237", change: "+10.75%" },
  { symbol: "FLOKI", pair: "FLOKI/USDT", price: "0.00019", change: "+1.12%" },
  { symbol: "SHIB", pair: "SHIB/USDT", price: "0.000024", change: "-0.42%" },
  { symbol: "NEIRO", pair: "NEIRO/USDT", price: "0.0018", change: "+6.31%" },
] as const;

export function TokenMarketListPlaceholder() {
  return (
    <section
      className="token-market-sidebar panel-surface"
      aria-label="Market list placeholder"
    >
      <div className="token-market-sidebar__toolbar">
        <div className="token-market-sidebar__search" aria-hidden>
          <PumpIcon icon={faSearch} className="h-3.5 w-3.5 shrink-0 opacity-50" />
          <span className="truncate text-caption text-pump-muted">Search</span>
        </div>
        <div className="token-market-sidebar__filters" aria-hidden>
          {["All", "New", "Hot"].map((label) => (
            <span
              key={label}
              className={
                label === "All"
                  ? "token-market-sidebar__filter token-market-sidebar__filter--active"
                  : "token-market-sidebar__filter"
              }
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="token-market-sidebar__head" aria-hidden>
        <span>Pair</span>
        <span className="text-right">Last</span>
        <span className="text-right">24h</span>
      </div>

      <div className="token-market-sidebar__list">
        {PLACEHOLDER_ROWS.map((row) => {
          const positive = row.change.startsWith("+");
          return (
            <div key={row.pair} className="token-market-sidebar__row" aria-hidden>
              <div className="min-w-0">
                <p className="truncate text-caption font-medium text-pump-text">{row.symbol}</p>
                <p className="truncate text-[11px] text-pump-muted">/USDT</p>
              </div>
              <span className="financial-value text-caption text-pump-text">{row.price}</span>
              <span
                className={`financial-value text-caption text-right ${
                  positive ? "text-pump-success" : "text-pump-danger"
                }`}
              >
                {row.change}
              </span>
            </div>
          );
        })}
        <p className="token-market-sidebar__note text-caption text-pump-muted">
          Placeholder — live market list coming soon.
        </p>
      </div>
    </section>
  );
}
