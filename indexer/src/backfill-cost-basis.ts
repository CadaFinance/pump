/**
 * One-time backfill: replay trades into remaining_cost_basis_zug + realized_pnl_zug.
 * Run after migration 010 on existing deployments.
 *
 *   npm run backfill-cost-basis
 */
import "dotenv/config";
import pg from "pg";
import { applyTradeToPositionCost, emptyPositionCostState } from "./position-cost.js";

const pool = new pg.Pool({ connectionString: process.env.LAUNCHPAD_DATABASE_URL });

type TradeRow = {
  side: string;
  zug_amount: string;
  fee_zug: string;
  token_amount: string;
  block_time: Date;
  block_number: string;
  log_index: number;
};

async function replayWalletToken(
  tokenAddress: string,
  walletAddress: string
): Promise<{ remainingCostBasis: string; realizedPnl: string; tokenBalance: string }> {
  const result = await pool.query<TradeRow>(
    `
      SELECT side, zug_amount::text, fee_zug::text, token_amount::text,
             block_time, block_number::text, log_index
      FROM trades
      WHERE token_address = $1 AND trader_address = $2
      ORDER BY block_time ASC, block_number ASC, log_index ASC
    `,
    [tokenAddress, walletAddress]
  );

  let state = emptyPositionCostState();

  for (const row of result.rows) {
    const isBuy = row.side === "BUY";
    state = applyTradeToPositionCost(
      state,
      isBuy,
      Number(row.zug_amount),
      Number(row.fee_zug),
      Number(row.token_amount)
    );
  }

  return {
    remainingCostBasis: String(state.remainingCostBasis),
    realizedPnl: String(state.realizedPnl),
    tokenBalance: String(state.tokenBalance),
  };
}

async function main(): Promise<void> {
  const pairs = await pool.query<{ token_address: string; address: string }>(
    `SELECT DISTINCT token_address, address FROM user_positions`
  );

  let updated = 0;
  for (const { token_address, address } of pairs.rows) {
    const replayed = await replayWalletToken(token_address, address);
    await pool.query(
      `
        UPDATE user_positions
        SET remaining_cost_basis_zug = $3::numeric,
            realized_pnl_zug = $4::numeric,
            updated_at = now()
        WHERE token_address = $1 AND address = $2
      `,
      [token_address, address, replayed.remainingCostBasis, replayed.realizedPnl]
    );
    updated += 1;
  }

  console.log(`backfill-cost-basis: updated ${updated} user_positions rows`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
