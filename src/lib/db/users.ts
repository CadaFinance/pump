import {
  defaultAvatarIdForAddress,
  isValidUserAvatarId,
  type UserAvatarId,
} from "@/lib/user-avatars";
import { getLaunchpadPool } from "@/lib/db/launchpad";

export async function getOrAssignUserAvatar(address: string): Promise<UserAvatarId> {
  const db = getLaunchpadPool();
  const normalized = address.toLowerCase();
  const fallback = defaultAvatarIdForAddress(normalized);

  const existing = await db.query<{ avatar_id: string | null }>(
    `SELECT avatar_id FROM users WHERE address = $1`,
    [normalized]
  );

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO users (address, last_active, avatar_id) VALUES ($1, now(), $2)`,
      [normalized, fallback]
    );
    return fallback;
  }

  const saved = existing.rows[0]?.avatar_id;
  if (saved && isValidUserAvatarId(saved)) {
    return saved;
  }

  await db.query(
    `UPDATE users SET avatar_id = $2, last_active = now() WHERE address = $1`,
    [normalized, fallback]
  );
  return fallback;
}

export async function setUserAvatar(address: string, avatarId: string): Promise<UserAvatarId> {
  if (!isValidUserAvatarId(avatarId)) {
    throw new Error("Invalid avatar");
  }

  const db = getLaunchpadPool();
  const normalized = address.toLowerCase();

  await db.query(
    `
    INSERT INTO users (address, last_active, avatar_id)
    VALUES ($1, now(), $2)
    ON CONFLICT (address) DO UPDATE
    SET avatar_id = EXCLUDED.avatar_id,
        last_active = now()
    `,
    [normalized, avatarId]
  );

  return avatarId;
}
