-- Avg-cost open-lot basis + corrected realized PnL (indexed at trade time).
ALTER TABLE user_positions
  ADD COLUMN IF NOT EXISTS remaining_cost_basis_zug numeric(78,18) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN user_positions.remaining_cost_basis_zug IS
  'Open-lot cost basis (net BNB after fees). Resets when token_balance reaches 0.';
