-- Fix token_board_stats MCAP from bonding spot (per-token virtual reserves)
-- Run: sudo -u postgres psql -d pump_db -f db/refresh/reconcile_token_board_stats_mcap.sql

UPDATE token_board_stats tbs
SET
  spot_price_zug = CASE
    WHEN (1000000000::numeric - COALESCE(b.token_sold, 0)) > 0
    THEN (COALESCE(b.virtual_zug_reserve, 5)::numeric + COALESCE(b.reserve_zug, 0))
         / (COALESCE(b.virtual_token_reserve, 1000000000)::numeric - COALESCE(b.token_sold, 0))
    ELSE tbs.spot_price_zug
  END,
  market_cap_zug = CASE
    WHEN (1000000000::numeric - COALESCE(b.token_sold, 0)) > 0
    THEN ((COALESCE(b.virtual_zug_reserve, 5)::numeric + COALESCE(b.reserve_zug, 0))
         / (COALESCE(b.virtual_token_reserve, 1000000000)::numeric - COALESCE(b.token_sold, 0)))
         * 1000000000
    ELSE tbs.market_cap_zug
  END,
  ath_market_cap_zug = GREATEST(
    tbs.ath_market_cap_zug,
    CASE
      WHEN (1000000000::numeric - COALESCE(b.token_sold, 0)) > 0
      THEN ((COALESCE(b.virtual_zug_reserve, 5)::numeric + COALESCE(b.reserve_zug, 0))
           / (COALESCE(b.virtual_token_reserve, 1000000000)::numeric - COALESCE(b.token_sold, 0)))
           * 1000000000
      ELSE 0
    END
  ),
  reserve_zug = COALESCE(b.reserve_zug, tbs.reserve_zug),
  token_sold = COALESCE(b.token_sold, tbs.token_sold),
  updated_at = now()
FROM bonding_states b
WHERE b.token_address = tbs.token_address;
