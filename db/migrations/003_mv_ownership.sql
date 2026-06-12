-- Fix MV ownership if 002 was applied before grants were added (run as postgres)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relname = 'mv_token_trade_stats' AND c.relkind = 'm') THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_indexer') THEN
      ALTER MATERIALIZED VIEW mv_token_trade_stats OWNER TO pump_indexer;
      ALTER MATERIALIZED VIEW mv_token_price_anchors OWNER TO pump_indexer;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pump_app') THEN
      GRANT SELECT ON mv_token_trade_stats TO pump_app;
      GRANT SELECT ON mv_token_price_anchors TO pump_app;
    END IF;
  END IF;
END $$;
