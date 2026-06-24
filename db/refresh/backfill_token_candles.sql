-- One-shot SQL backfill pointer — prefer indexer replay for spot-accurate OHLC.
-- Run migration first: db/migrations/023_token_candles.sql
-- Then: npm run backfill-candles --workspace @pump/indexer
-- Optional single token: npm run backfill-candles --workspace @pump/indexer -- 0x...

SELECT 'Use npm run backfill-candles --workspace @pump/indexer' AS note;
