-- Tüm uygulama verisini siler; şema (tablolar, index, trigger, MV tanımları, fonksiyonlar) aynen kalır.
--
-- Korunan: contract_registry, launchpad_tasks, platform_settings, admin_todos
-- (system mission tanımları, admin platform ayarları, ops todo listesi)
--
-- VM örnek:
--   sudo -u postgres psql -d pump_db -f db/scripts/wipe_all_data.sql
--
-- Migration sonrası tertemiz başlangıç:
--   1) Önce bekleyen migration'ları uygula (004, 005, ...)
--   2) Bu script'i çalıştır
--   3) Indexer otomatik: admin wipe butonu systemctl restart yapar; veya manuel restart

BEGIN;

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
  public.token_favorites,
  public.token_media,
  public.user_positions,
  public.user_volumes,
  public.tokens,
  public.users,
  public.telegram_wallets,
  public.email_wallets,
  public.indexer_state
RESTART IDENTITY CASCADE;

-- MV'ler base tablolardan türetilir; satırları yenile (tanımlar korunur)
REFRESH MATERIALIZED VIEW public.mv_token_trade_stats;
REFRESH MATERIALIZED VIEW public.mv_token_price_anchors;

-- Indexer yeniden tarama: en erken contract deploy block'tan başla
INSERT INTO indexer_state (key, last_block_number, updated_at)
SELECT
  'launchpad_indexer',
  GREATEST(0, MIN(deployment_block_number) - 1),
  now()
FROM contract_registry
WHERE is_active = true
  AND deployment_block_number IS NOT NULL
  AND deployment_block_number > 0
ON CONFLICT (key) DO UPDATE
SET last_block_number = EXCLUDED.last_block_number,
    updated_at = now();

COMMIT;
