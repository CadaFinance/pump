/**
 * Replay trades into token_candles (all intervals).
 *
 *   npm run backfill-candles --workspace @pump/indexer
 *   npm run backfill-candles --workspace @pump/indexer -- 0x...
 *
 * Env: LAUNCHPAD_DATABASE_URL (auto-loads /var/www/pump/Indexer/.env on VM).
 * Optional: PUMP_INDEXER_ENV=/path/to/.env
 */
import pg from "pg";
import { upsertCandlesAfterTrade, incrementalCandlesEnabled } from "./candles.js";
import { loadIndexerEnv } from "./load-env.js";

loadIndexerEnv();

type TradeRow = {
  side: string;
  block_time: Date;
  zug_amount: string;
  fee_zug: string;
  token_amount: string;
};

function parseDecimalToWei(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  const padded = `${whole}${fraction.padEnd(18, "0").slice(0, 18)}`;
  return BigInt(padded);
}

async function main(): Promise<void> {
  if (!incrementalCandlesEnabled()) {
    console.warn("INCREMENTAL_CANDLES is disabled — enabling for backfill run.");
  }

  const url = process.env.LAUNCHPAD_DATABASE_URL;
  if (!url) {
    throw new Error(
      "LAUNCHPAD_DATABASE_URL is required. Set it in /var/www/pump/Indexer/.env " +
        "(pump_indexer user — needs INSERT on token_candles) or export before running."
    );
  }

  const pool = new pg.Pool({ connectionString: url, max: 4 });
  const tokenArg = process.argv[2]?.toLowerCase();

  try {
    const tokens = await pool.query<{ address: string }>(
      tokenArg
        ? `SELECT address FROM tokens WHERE address = $1`
        : `SELECT address FROM tokens ORDER BY created_at ASC`,
      tokenArg ? [tokenArg] : []
    );

    console.log(`Backfilling candles for ${tokens.rowCount ?? 0} token(s)...`);

    for (const { address } of tokens.rows) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `DELETE FROM token_candles WHERE token_address = $1`,
          [address]
        );

        const trades = await client.query<TradeRow>(
          `
            SELECT
              side,
              block_time,
              zug_amount::text,
              fee_zug::text,
              token_amount::text
            FROM trades
            WHERE token_address = $1
            ORDER BY block_time ASC, block_number ASC, log_index ASC
          `,
          [address]
        );

        let reserve = 0n;
        let sold = 0n;

        for (const trade of trades.rows) {
          const isBuy = trade.side === "BUY";
          const zugAmount = parseDecimalToWei(trade.zug_amount);
          const feeZug = parseDecimalToWei(trade.fee_zug);
          const tokenAmount = parseDecimalToWei(trade.token_amount);

          if (isBuy) {
            reserve += zugAmount - feeZug;
            sold += tokenAmount;
          } else {
            reserve -= zugAmount;
            sold -= tokenAmount;
          }

          await upsertCandlesAfterTrade(client, {
            tokenAddress: address,
            blockTime: trade.block_time,
            isBuy,
            reserveAfter: reserve,
            soldAfter: sold,
            zugAmount,
            feeZug,
            tokenAmount,
          });
        }

        await client.query("COMMIT");
        console.log(`  ${address}: ${trades.rowCount ?? 0} trades`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    console.log("Candle backfill complete.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
