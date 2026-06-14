-- Speed up admin 24h trade counts and time-range scans.
-- Run once: psql -d pump_db -f db/migrations/006_trades_block_time_index.sql

CREATE INDEX IF NOT EXISTS idx_trades_block_time ON public.trades (block_time DESC);
