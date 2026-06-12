import pg from "pg";
import type { Hash } from "viem";
import { PointsBridge, TASK_KEYS } from "./points.js";
import { KOTH_TOKEN_SUPPLY } from "./koth-config.js";

export type KingContext = {
  launchpadPool: pg.Pool;
  pointsBridge: PointsBridge;
};

type TopToken = {
  tokenAddress: string;
  creatorAddress: string;
  marketCapBnb: number;
  holderCount: number;
  tradeCount: number;
};

/** #1 FDV among bonding tokens — same ordering as Arena table (MCAP desc). */
export async function getTopMcapToken(pool: pg.Pool): Promise<TopToken | null> {
  const result = await pool.query<{
    token_address: string;
    creator_address: string;
    market_cap_zug: string;
    holder_count: number;
    trade_count: number;
  }>(
    `
      SELECT
        t.address AS token_address,
        t.creator_address,
        (COALESCE(b.last_price_zug, 0) * ${KOTH_TOKEN_SUPPLY})::text AS market_cap_zug,
        COALESCE(b.holder_count, 0) AS holder_count,
        COALESCE(b.trade_count, 0) AS trade_count
      FROM tokens t
      LEFT JOIN bonding_states b ON b.token_address = t.address
      WHERE t.is_hidden = false
        AND t.status = 'BONDING'
        AND COALESCE(b.trade_count, 0) > 0
      ORDER BY (COALESCE(b.last_price_zug, 0) * ${KOTH_TOKEN_SUPPLY}) DESC,
               COALESCE(b.trade_count, 0) DESC,
               t.created_at ASC
      LIMIT 1
    `
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    tokenAddress: row.token_address,
    creatorAddress: row.creator_address,
    marketCapBnb: Number(row.market_cap_zug),
    holderCount: row.holder_count,
    tradeCount: row.trade_count,
  };
}

/** @deprecated Alias for scripts — use getTopMcapToken */
export const getTopBondingToken = getTopMcapToken;

async function getActiveKingToken(pool: pg.Pool): Promise<string | null> {
  const result = await pool.query<{ token_address: string }>(
    `
      SELECT token_address
      FROM king_history
      WHERE dethroned_at IS NULL
      ORDER BY crowned_at DESC
      LIMIT 1
    `
  );

  return result.rows[0]?.token_address ?? null;
}

async function dethroneActiveKing(pool: pg.Pool, blockTime: Date): Promise<void> {
  await pool.query(
    `
      UPDATE king_history
      SET dethroned_at = $1
      WHERE dethroned_at IS NULL
    `,
    [blockTime]
  );
}

async function awardKingMission(
  ctx: KingContext,
  creatorAddress: string,
  tokenAddress: string,
  txHash: Hash,
  blockTime: Date,
  marketCapBnb: number
): Promise<void> {
  await ctx.pointsBridge.award({
    address: creatorAddress,
    taskKey: TASK_KEYS.kingOfHill,
    eventId: tokenAddress,
    txHash,
    blockTime,
    metadata: {
      token: tokenAddress,
      market_cap_zug: marketCapBnb,
      source: "king_of_the_hill",
    },
  });
}

/**
 * Updates king_history when #1 MCAP changes and awards LAUNCHPAD_KING_OF_HILL once per creator.
 * Safe to call repeatedly — points bridge is idempotent.
 */
export async function recomputeKing(
  ctx: KingContext,
  blockTime: Date,
  txHash: Hash
): Promise<void> {
  const top = await getTopMcapToken(ctx.launchpadPool);
  const activeKingToken = await getActiveKingToken(ctx.launchpadPool);

  if (!top) {
    if (activeKingToken) {
      await dethroneActiveKing(ctx.launchpadPool, blockTime);
    }
    return;
  }

  if (activeKingToken === top.tokenAddress) {
    await awardKingMission(
      ctx,
      top.creatorAddress,
      top.tokenAddress,
      txHash,
      blockTime,
      top.marketCapBnb
    );
    return;
  }

  const client = await ctx.launchpadPool.connect();
  try {
    await client.query("BEGIN");

    if (activeKingToken) {
      await client.query(
        `
          UPDATE king_history
          SET dethroned_at = $1
          WHERE dethroned_at IS NULL
        `,
        [blockTime]
      );
    }

    const pointsEventId = `${TASK_KEYS.kingOfHill}:${top.tokenAddress}`;

    await client.query(
      `
        INSERT INTO king_history (
          token_address,
          creator_address,
          score,
          volume_24h_zug,
          holder_count,
          trade_count,
          social_shares,
          crowned_at,
          points_event_id
        ) VALUES ($1, $2, $3, 0, $4, $5, 0, $6, $7)
      `,
      [
        top.tokenAddress,
        top.creatorAddress,
        top.marketCapBnb,
        top.holderCount,
        top.tradeCount,
        blockTime,
        pointsEventId,
      ]
    );

    await client.query("COMMIT");

    await awardKingMission(
      ctx,
      top.creatorAddress,
      top.tokenAddress,
      txHash,
      blockTime,
      top.marketCapBnb
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
