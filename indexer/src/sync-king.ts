import type { Hash } from "viem";
import { config } from "./config.js";
import { closePools, createPools } from "./db.js";
import { getTopMcapToken, recomputeKing } from "./king.js";
import { PointsBridge } from "./points.js";

/** One-off backfill when a token is already #1 but king mission was never awarded. */
async function main(): Promise<void> {
  const pools = createPools(config.launchpadDatabaseUrl, config.vm1MainDatabaseUrl);
  const pointsBridge = new PointsBridge(pools.vm1);

  try {
    const top = await getTopMcapToken(pools.launchpad);
    if (!top) {
      console.log("No bonding tokens found — nothing to sync.");
      return;
    }

    const txResult = await pools.launchpad.query<{ launch_tx_hash: string }>(
      "SELECT launch_tx_hash FROM tokens WHERE address = $1",
      [top.tokenAddress]
    );
    const txHash = (txResult.rows[0]?.launch_tx_hash ?? "0x" + "0".repeat(64)) as Hash;

    console.log(
      `Current #1: ${top.tokenAddress} (creator ${top.creatorAddress}, mcap ${top.marketCapBnb} BNB)`
    );

    await recomputeKing(
      { launchpadPool: pools.launchpad, pointsBridge },
      new Date(),
      txHash
    );

    console.log("King sync complete. Refresh /missions in the TMA.");
  } finally {
    await closePools(pools);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
