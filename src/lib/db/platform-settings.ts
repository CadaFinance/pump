import {
  DEFAULT_MIN_INITIAL_BUY_BNB,
  normalizeMinInitialBuyBnb,
  PLATFORM_SETTING_MIN_INITIAL_BUY_BNB,
} from "@/lib/platform-settings";
import { getLaunchpadPool } from "@/lib/db/launchpad";

export type PlatformSettingRow = {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
};

export async function getPlatformSetting(key: string): Promise<PlatformSettingRow | null> {
  const pool = getLaunchpadPool();
  const result = await pool.query<{
    key: string;
    value: string;
    updated_at: Date;
    updated_by: string | null;
  }>(
    `
      SELECT key, value, updated_at, updated_by
      FROM platform_settings
      WHERE key = $1
    `,
    [key]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}

export async function getMinInitialBuyBnb(): Promise<string> {
  const row = await getPlatformSetting(PLATFORM_SETTING_MIN_INITIAL_BUY_BNB);
  if (!row) return DEFAULT_MIN_INITIAL_BUY_BNB;

  try {
    return normalizeMinInitialBuyBnb(row.value);
  } catch {
    return DEFAULT_MIN_INITIAL_BUY_BNB;
  }
}

export async function setMinInitialBuyBnb(
  value: string,
  updatedBy?: string
): Promise<PlatformSettingRow> {
  const normalized = normalizeMinInitialBuyBnb(value);
  const pool = getLaunchpadPool();

  const result = await pool.query<{
    key: string;
    value: string;
    updated_at: Date;
    updated_by: string | null;
  }>(
    `
      INSERT INTO platform_settings (key, value, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
      RETURNING key, value, updated_at, updated_by
    `,
    [PLATFORM_SETTING_MIN_INITIAL_BUY_BNB, normalized, updatedBy ?? null]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to save platform setting");
  }

  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}
