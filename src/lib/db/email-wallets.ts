import type { Hex } from "viem";
import { getLaunchpadPool } from "@/lib/db/launchpad";
import { decryptPrivateKey, encryptPrivateKey } from "@/lib/wallet-email-crypto";

export type EmailWalletRow = {
  email: string;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
};

type EmailWalletDbRow = {
  email: string;
  eoa_address: string;
  scw_address: string;
  encrypted_private_key: string;
};

function mapRow(row: EmailWalletDbRow): EmailWalletRow {
  return {
    email: row.email,
    eoaAddress: row.eoa_address,
    scwAddress: row.scw_address,
    privateKey: decryptPrivateKey(row.encrypted_private_key),
  };
}

export async function getEmailWallet(email: string): Promise<EmailWalletRow | null> {
  const db = getLaunchpadPool();
  const result = await db.query<EmailWalletDbRow>(
    `
    SELECT email, eoa_address, scw_address, encrypted_private_key
    FROM email_wallets
    WHERE email = $1
    `,
    [email]
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function insertEmailWallet(input: {
  email: string;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
}): Promise<EmailWalletRow> {
  const db = getLaunchpadPool();
  const encrypted = encryptPrivateKey(input.privateKey);
  const result = await db.query<EmailWalletDbRow>(
    `
    INSERT INTO email_wallets (email, eoa_address, scw_address, encrypted_private_key)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
    RETURNING email, eoa_address, scw_address, encrypted_private_key
    `,
    [input.email, input.eoaAddress.toLowerCase(), input.scwAddress.toLowerCase(), encrypted]
  );

  if (result.rows[0]) {
    return mapRow(result.rows[0]);
  }

  const existing = await getEmailWallet(input.email);
  if (!existing) {
    throw new Error("Could not persist email wallet");
  }
  return existing;
}
