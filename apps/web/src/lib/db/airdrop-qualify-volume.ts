import type { Pool } from "pg";

/** Net BNB bought on the linked token during a campaign qualify window. */
const QUALIFYING_BUY_VOLUME_SQL = `
  SELECT COALESCE(SUM(GREATEST(t.zug_amount - COALESCE(t.fee_zug, 0), 0)), 0)::text AS buy_volume
  FROM trades t
  WHERE t.token_address = $1
    AND t.trader_address = ANY($2::text[])
    AND t.side = 'BUY'
    AND t.block_time >= $3::timestamptz
    AND t.block_time <= $4::timestamptz
`;

/** SCW + EOA aliases so progress matches trades indexed under either address. */
export async function resolveProgressTraderAddresses(
  pool: Pool,
  address: string
): Promise<string[]> {
  const normalized = address.toLowerCase();
  const aliases = new Set<string>([normalized]);

  const linked = await pool.query<{ eoa_address: string; scw_address: string }>(
    `
      SELECT eoa_address, scw_address FROM telegram_wallets
      WHERE eoa_address = $1 OR scw_address = $1
      UNION
      SELECT eoa_address, scw_address FROM oauth_wallets
      WHERE eoa_address = $1 OR scw_address = $1
      UNION
      SELECT eoa_address, scw_address FROM email_wallets
      WHERE eoa_address = $1 OR scw_address = $1
    `,
    [normalized]
  );

  for (const row of linked.rows) {
    aliases.add(row.eoa_address);
    aliases.add(row.scw_address);
  }

  return [...aliases];
}

export async function queryQualifyingBuyVolumeBnb(
  pool: Pool,
  input: {
    linkedToken: string;
    traderAddresses: string[];
    qualifyStart: string;
    qualifyEnd: string;
  }
): Promise<string> {
  if (input.traderAddresses.length === 0) return "0";

  const result = await pool.query<{ buy_volume: string }>(QUALIFYING_BUY_VOLUME_SQL, [
    input.linkedToken.toLowerCase(),
    input.traderAddresses.map((a) => a.toLowerCase()),
    input.qualifyStart,
    input.qualifyEnd,
  ]);

  return result.rows[0]?.buy_volume ?? "0";
}
