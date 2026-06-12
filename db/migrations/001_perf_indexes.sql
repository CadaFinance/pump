-- Phase 1a: performance indexes (CONCURRENTLY — safe on production)
-- Run: sudo -u postgres psql -d pump_db -f db/migrations/001_perf_indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_positions_token_holders
  ON public.user_positions (token_address)
  WHERE token_balance > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_positions_address_holders
  ON public.user_positions (address)
  WHERE token_balance > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_token_side_time
  ON public.trades (token_address, side, block_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_token_time_asc
  ON public.trades (token_address, block_time ASC, block_number ASC, log_index ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tokens_visible_created
  ON public.tokens (created_at DESC)
  WHERE is_hidden = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bonding_states_mcap
  ON public.bonding_states (market_cap_zug DESC)
  WHERE market_cap_zug > 0;
