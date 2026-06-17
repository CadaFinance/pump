/**
 * Recompute bonding_states.last_price_zug as marginal spot (chart / holders mark).
 * Run once after deploying indexer spot-price fix on existing tokens.
 *
 *   npm run backfill-spot-price
 */
import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.LAUNCHPAD_DATABASE_URL });

const VIRTUAL_BNB = 5;
const TOKEN_SUPPLY = 1_000_000_000;

function spotPriceFromReserves(reserveZug: number, soldTokens: number): number {
  const poolZug = VIRTUAL_BNB + reserveZug;
  const poolTokens = TOKEN_SUPPLY - soldTokens;
  if (poolTokens <= 0 || poolZug <= 0) return 0;
  return poolZug / poolTokens;
}

async function main(): Promise<void> {
  const rows = await pool.query<{
    token_address: string;
    reserve_zug: string;
    token_sold: string;
    last_price_zug: string;
  }>(
    `
      SELECT token_address, reserve_zug::text, token_sold::text, last_price_zug::text
      FROM bonding_states
    `
  );

  let updated = 0;
  for (const row of rows.rows) {
    const reserve = Number(row.reserve_zug);
    const sold = Number(row.token_sold);
    const spot = spotPriceFromReserves(reserve, sold);
    if (spot <= 0) continue;

    const prev = Number(row.last_price_zug);
    if (Math.abs(spot - prev) / Math.max(prev, spot, 1e-18) < 1e-9) continue;

    await pool.query(
      `
        UPDATE bonding_states
        SET last_price_zug = $2,
            market_cap_zug = $2::numeric * 1000000000,
            updated_at = now()
        WHERE token_address = $1
      `,
      [row.token_address, spot]
    );
    updated += 1;
  }

  console.log(`Updated spot price for ${updated} / ${rows.rowCount} tokens`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
