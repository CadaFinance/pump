-- Materialized participation progress (updated by API + indexer; read by portfolio / mine list)
ALTER TABLE airdrop_participants
  ADD COLUMN IF NOT EXISTS social_tasks_total smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_tasks_completed smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hold_met boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buy_met boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onchain_qualified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS progress_pct smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewer_rank integer,
  ADD COLUMN IF NOT EXISTS claimable_amount numeric(78,18),
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE airdrop_participants
  DROP CONSTRAINT IF EXISTS airdrop_participants_progress_pct_check;

ALTER TABLE airdrop_participants
  ADD CONSTRAINT airdrop_participants_progress_pct_check
  CHECK (progress_pct >= 0 AND progress_pct <= 100);
