"use client";

export type TokenMobileMainTab = "chart" | "trades" | "holders";

const MOBILE_MAIN_TABS: ReadonlyArray<{ id: TokenMobileMainTab; label: string }> = [
  { id: "chart", label: "Chart" },
  { id: "trades", label: "Trades" },
  { id: "holders", label: "Holders" },
];

type TokenMobileMainTabsProps = {
  active: TokenMobileMainTab;
  onChange: (tab: TokenMobileMainTab) => void;
};

/** Hyperliquid-style primary view switcher — mobile token terminal only. */
export function TokenMobileMainTabs({ active, onChange }: TokenMobileMainTabsProps) {
  return (
    <div
      className="token-mobile-main-tabs lg:hidden"
      role="tablist"
      aria-label="Token views"
    >
      {MOBILE_MAIN_TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`token-mobile-tab-${id}`}
          aria-selected={active === id}
          aria-controls={`token-mobile-panel-${id}`}
          className={
            active === id
              ? "token-mobile-main-tab token-mobile-main-tab--active"
              : "token-mobile-main-tab"
          }
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
