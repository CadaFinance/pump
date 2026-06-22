import { getLaunchpadPool } from "@/lib/db/launchpad";
import { decryptPrivateKey, encryptPrivateKey } from "@/lib/wallet-key-crypto";
import type { Hex } from "viem";

export type OAuthProvider = "google" | "apple";

export type OAuthWalletRow = {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
};

type DbRow = {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  display_name: string | null;
  eoa_address: string;
  scw_address: string;
  encrypted_private_key: string;
};

function mapRow(row: DbRow): OAuthWalletRow {
  return {
    provider: row.provider,
    subject: row.subject,
    email: row.email,
    displayName: row.display_name,
    eoaAddress: row.eoa_address,
    scwAddress: row.scw_address,
    privateKey: decryptPrivateKey(row.encrypted_private_key),
  };
}

export async function getOAuthWallet(
  provider: OAuthProvider,
  subject: string
): Promise<OAuthWalletRow | null> {
  const db = getLaunchpadPool();
  const result = await db.query<DbRow>(
    `
    SELECT provider, subject, email, display_name, eoa_address, scw_address, encrypted_private_key
    FROM oauth_wallets
    WHERE provider = $1 AND subject = $2
    `,
    [provider, subject]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function insertOAuthWallet(input: {
  provider: OAuthProvider;
  subject: string;
  email?: string | null;
  displayName?: string | null;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
}): Promise<OAuthWalletRow> {
  const db = getLaunchpadPool();
  const encrypted = encryptPrivateKey(input.privateKey);
  const result = await db.query<DbRow>(
    `
    INSERT INTO oauth_wallets (
      provider, subject, email, display_name, eoa_address, scw_address, encrypted_private_key
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (provider, subject) DO NOTHING
    RETURNING provider, subject, email, display_name, eoa_address, scw_address, encrypted_private_key
    `,
    [
      input.provider,
      input.subject,
      input.email?.toLowerCase() ?? null,
      input.displayName ?? null,
      input.eoaAddress.toLowerCase(),
      input.scwAddress.toLowerCase(),
      encrypted,
    ]
  );

  if (result.rows[0]) return mapRow(result.rows[0]);

  const existing = await getOAuthWallet(input.provider, input.subject);
  if (!existing) throw new Error("Could not persist OAuth wallet");
  return existing;
}

export async function updateOAuthProfile(
  provider: OAuthProvider,
  subject: string,
  profile: { email?: string | null; displayName?: string | null }
): Promise<void> {
  const db = getLaunchpadPool();
  await db.query(
    `
    UPDATE oauth_wallets
    SET
      email = COALESCE($3, email),
      display_name = COALESCE($4, display_name),
      updated_at = now()
    WHERE provider = $1 AND subject = $2
    `,
    [
      provider,
      subject,
      profile.email?.toLowerCase() ?? null,
      profile.displayName ?? null,
    ]
  );
}
