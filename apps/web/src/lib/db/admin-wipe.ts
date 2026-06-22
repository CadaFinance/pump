import { getLaunchpadPool } from "@/lib/db/launchpad";
import { readIndexerCursorForEnv } from "@/lib/db/indexer-env-seed";

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
  "oauth_wallets",
  "email_wallets",
  "…and related airdrop / points / referral rows",
] as const;

export type WipeAppDataResult = {
  ok: true;
  preserved: string[];
};

export async function readIndexerCursor(): Promise<{
  key: string;
  block: string;
  updatedAt: string;
} | null> {
  return readIndexerCursorForEnv();
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
