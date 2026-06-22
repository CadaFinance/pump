-- Re-seed indexer cursor from contract_registry after wipe + return seed block for API.
-- Run after 018: sudo -u postgres psql -d pump_db -f db/migrations/019_wipe_resync_indexer.sql

CREATE OR REPLACE FUNCTION public.wipe_launchpad_app_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seed_block bigint;
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

  REFRESH MATERIALIZED VIEW public.mv_token_trade_stats;
  REFRESH MATERIALIZED VIEW public.mv_token_price_anchors;

  SELECT MIN(deployment_block_number) - 1
  INTO seed_block
  FROM contract_registry
  WHERE is_active = true
    AND deployment_block_number IS NOT NULL
    AND deployment_block_number > 0;

  IF seed_block IS NOT NULL AND seed_block >= 0 THEN
    INSERT INTO indexer_state (key, last_block_number, updated_at)
    VALUES ('launchpad_indexer', seed_block, now())
    ON CONFLICT (key) DO UPDATE
    SET last_block_number = EXCLUDED.last_block_number,
        updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'preserved', jsonb_build_array(
      'contract_registry',
      'launchpad_tasks',
      'platform_settings',
      'admin_todos'
    ),
    'indexerSeedBlock', CASE WHEN seed_block IS NULL THEN NULL ELSE seed_block::text END,
    'indexerResyncFromBlock', CASE
      WHEN seed_block IS NULL THEN NULL
      ELSE (seed_block + 1)::text
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wipe_launchpad_app_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wipe_launchpad_app_data() TO pump_app;
