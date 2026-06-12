-- Refresh materialized views (safe for production with CONCURRENTLY)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_token_trade_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_token_price_anchors;
