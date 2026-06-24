-- Phase 1: pre-aggregated spot OHLC candles (indexer-maintained on each trade)
-- Run: sudo -u postgres psql -d pump_db -f db/migrations/023_token_candles.sql
-- Backfill: npm run backfill-candles --workspace @pump/indexer

CREATE TABLE IF NOT EXISTS token_candles (
  token_address text NOT NULL REFERENCES tokens(address) ON DELETE CASCADE,
  candle_interval text NOT NULL,
  bucket_ts timestamptz NOT NULL,
  open_zug numeric NOT NULL,
  high_zug numeric NOT NULL,
  low_zug numeric NOT NULL,
  close_zug numeric NOT NULL,
  volume_zug numeric NOT NULL DEFAULT 0,
  buy_volume_zug numeric NOT NULL DEFAULT 0,
  trade_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT token_candles_address_check CHECK (token_address = lower(token_address)),
  CONSTRAINT token_candles_interval_check CHECK (
    candle_interval = ANY (ARRAY['15s'::text, '1m'::text, '5m'::text, '15m'::text, '1h'::text, '4h'::text])
  ),
  CONSTRAINT token_candles_ohlc_check CHECK (
    open_zug >= 0
    AND high_zug >= 0
    AND low_zug >= 0
    AND close_zug >= 0
    AND high_zug >= low_zug
  ),
  CONSTRAINT token_candles_volume_check CHECK (
    volume_zug >= 0
    AND buy_volume_zug >= 0
    AND buy_volume_zug <= volume_zug
  ),
  CONSTRAINT token_candles_trade_count_check CHECK (trade_count >= 0),
  PRIMARY KEY (token_address, candle_interval, bucket_ts)
);

CREATE INDEX IF NOT EXISTS idx_token_candles_lookup
  ON token_candles (token_address, candle_interval, bucket_ts DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_indexer') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON token_candles TO pump_indexer;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_app') THEN
    GRANT SELECT ON token_candles TO pump_app;
  END IF;
END $$;

-- Include token_candles in admin wipe (matches schema.sql wipe_launchpad_app_data).
CREATE OR REPLACE FUNCTION public.wipe_launchpad_app_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE
    public.airdrop_task_completions,
    public.airdrop_saves,
    public.airdrop_claims,
    public.airdrop_allocations,
    public.airdrop_participants,
    public.airdrop_social_tasks,
    public.airdrops,
    public.bonding_states,
    public.creator_fee_claims,
    public.referrer_fee_claims,
    public.referral_bindings,
    public.creator_follows,
    public.deep_links,
    public.king_history,
    public.launchpad_points_sync_log,
    public.launchpad_user_daily_completions,
    public.launchpad_user_task_completions,
    public.points_audit_log,
    public.trades,
    public.token_candles,
    public.token_favorites,
    public.token_media,
    public.user_positions,
    public.user_volumes,
    public.tokens,
    public.users,
    public.telegram_wallets,
    public.oauth_wallets,
    public.email_wallets,
    public.indexer_state
  RESTART IDENTITY CASCADE;

  REFRESH MATERIALIZED VIEW public.mv_token_trade_stats;
  REFRESH MATERIALIZED VIEW public.mv_token_price_anchors;

  RETURN jsonb_build_object(
    'ok', true,
    'preserved', jsonb_build_array(
      'contract_registry',
      'launchpad_tasks',
      'platform_settings',
      'admin_todos'
    )
  );
END;
$$;
