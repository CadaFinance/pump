-- Phase 2: materialized views for arena token stats
-- Run once: sudo -u postgres psql -d pump_db -f db/migrations/002_materialized_views.sql
-- Refresh: sudo -u postgres psql -d pump_db -f db/refresh/refresh_mvs.sql

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_token_trade_stats AS
SELECT
  tr.token_address,
  COUNT(*)::integer AS trade_count,
  COALESCE(
    SUM(GREATEST(tr.zug_amount - COALESCE(tr.fee_zug, 0), 0))
      FILTER (WHERE tr.block_time >= now() - interval '24 hours'),
    0
  )::text AS volume_24h_zug,
  COALESCE(
    SUM(GREATEST(tr.zug_amount - COALESCE(tr.fee_zug, 0), 0)) FILTER (
      WHERE tr.block_time >= now() - interval '48 hours'
        AND tr.block_time < now() - interval '24 hours'
    ),
    0
  )::text AS volume_24h_prev_zug,
  COUNT(*) FILTER (WHERE tr.block_time < now() - interval '24 hours')::integer AS trade_count_24h_ago,
  COUNT(DISTINCT tr.trader_address) FILTER (WHERE tr.block_time >= now() - interval '24 hours')::integer AS traders_24h,
  MAX(tr.price_zug) AS ath_price_zug
FROM trades tr
GROUP BY tr.token_address;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_token_trade_stats_token
  ON mv_token_trade_stats (token_address);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_token_price_anchors AS
SELECT
  t.address AS token_address,
  (
    SELECT tr.price_zug
    FROM trades tr
    WHERE tr.token_address = t.address
      AND tr.block_time >= now() - interval '1 hour'
    ORDER BY tr.block_time ASC, tr.block_number ASC, tr.log_index ASC
    LIMIT 1
  ) AS price_1h_ago,
  (
    SELECT tr.price_zug
    FROM trades tr
    WHERE tr.token_address = t.address
      AND tr.block_time >= now() - interval '6 hours'
    ORDER BY tr.block_time ASC, tr.block_number ASC, tr.log_index ASC
    LIMIT 1
  ) AS price_6h_ago,
  (
    SELECT tr.price_zug
    FROM trades tr
    WHERE tr.token_address = t.address
      AND tr.block_time <= now() - interval '24 hours'
    ORDER BY tr.block_time DESC, tr.block_number DESC, tr.log_index DESC
    LIMIT 1
  ) AS price_24h_ago,
  (
    SELECT tr.price_zug
    FROM trades tr
    WHERE tr.token_address = t.address
    ORDER BY tr.block_time ASC, tr.block_number ASC, tr.log_index ASC
    LIMIT 1
  ) AS price_first
FROM tokens t
WHERE t.is_hidden = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_token_price_anchors_token
  ON mv_token_price_anchors (token_address);

-- Indexer (pump_indexer) runs REFRESH CONCURRENTLY; TMA (pump_app) reads only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_indexer') THEN
    ALTER MATERIALIZED VIEW mv_token_trade_stats OWNER TO pump_indexer;
    ALTER MATERIALIZED VIEW mv_token_price_anchors OWNER TO pump_indexer;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_app') THEN
    GRANT SELECT ON mv_token_trade_stats TO pump_app;
    GRANT SELECT ON mv_token_price_anchors TO pump_app;
  END IF;
END $$;
