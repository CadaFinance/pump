-- Frozen USD cost basis + realized P/L (trade-time native/USD rate).
-- Mark-to-market unrealized USD = balance * spot * live_rate - remaining_cost_basis_usd.

ALTER TABLE public.user_positions
  ADD COLUMN IF NOT EXISTS remaining_cost_basis_usd numeric(24, 8) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS realized_pnl_usd numeric(24, 8) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.user_positions.remaining_cost_basis_usd IS
  'Open-lot USD cost (net native × native_usd_rate at each buy). Resets at zero balance.';
COMMENT ON COLUMN public.user_positions.realized_pnl_usd IS
  'Cumulative realized P/L in USD (sell proceeds USD − avg-cost USD removed).';
