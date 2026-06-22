import { getLaunchpadPool } from "@/lib/db/launchpad";

/** Must match admin UI — typed confirmation before wipe. */
export const WIPE_DATA_CONFIRMATION_PHRASE = "WIPE PUMP DATA";

export const WIPE_PRESERVED_TABLES = [
  "contract_registry",
  "launchpad_tasks",
  "platform_settings",
  "admin_todos",
] as const;

export const WIPE_TRUNCATED_TABLES = [
  "users",
  "tokens",
  "trades",
  "airdrops",
  "bonding_states",
  "user_positions",
  "indexer_state",
  "telegram_wallets",
  "email_wallets",
  "…and related airdrop / points / referral rows",
] as const;

export type WipeAppDataResult = {
  ok: true;
  preserved: string[];
  indexerSeedBlock?: string | null;
  indexerResyncFromBlock?: string | null;
};

export async function readIndexerCursor(): Promise<{
  key: string;
  block: string;
  updatedAt: string;
} | null> {
  const pool = getLaunchpadPool();
  const result = await pool.query<{
    key: string;
    last_block_number: string;
    updated_at: Date;
  }>(
    `SELECT key, last_block_number::text, updated_at
     FROM indexer_state
     WHERE key = 'launchpad_indexer'
     LIMIT 1`
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    key: row.key,
    block: row.last_block_number,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function wipeLaunchpadAppData(): Promise<WipeAppDataResult> {
  const pool = getLaunchpadPool();
  const result = await pool.query<{ wipe_launchpad_app_data: WipeAppDataResult }>(
    `SELECT wipe_launchpad_app_data() AS wipe_launchpad_app_data`
  );

  const payload = result.rows[0]?.wipe_launchpad_app_data;
  if (!payload?.ok) {
    throw new Error("Wipe function did not return success");
  }

  return payload;
}
