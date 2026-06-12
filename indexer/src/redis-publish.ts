import { Redis } from "ioredis";

let redis: Redis | null = null;

function redisEnabled(): boolean {
  return process.env.REDIS_PUBLISH_ENABLED === "true" && Boolean(process.env.REDIS_URL?.trim());
}

function getRedis(): Redis | null {
  if (!redisEnabled()) return null;

  if (!redis) {
    const url = process.env.REDIS_URL!.trim();
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on("error", (error: Error) => {
      console.warn("redis publish error:", error.message);
    });
  }

  return redis;
}

export type TradePublishPayload = {
  type: "trade";
  tokenAddress: string;
  trade: {
    id: string;
    side: string;
    traderAddress: string;
    zugAmount: string;
    tokenAmount: string;
    priceZug: string;
    txHash: string;
    logIndex: number;
    blockTime: string;
  };
  bonding: {
    reserveZug: string;
    marketCapZug: string;
    lastPriceZug: string;
    progressBps: number;
    tradeCount: number;
    holderCount: number;
  };
};

export async function publishTrade(payload: TradePublishPayload): Promise<void> {
  const client = getRedis();
  if (!client) return;

  const channel = `pump:trade:${payload.tokenAddress}`;
  const message = JSON.stringify(payload);

  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    await client.publish(channel, message);
    await client.publish("pump:board", message);
  } catch (error) {
    console.warn("redis publish trade failed:", error instanceof Error ? error.message : error);
  }
}

export async function publishKoth(payload: Record<string, unknown>): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    await client.publish("pump:koth", JSON.stringify({ type: "koth", ...payload }));
  } catch (error) {
    console.warn("redis publish koth failed:", error instanceof Error ? error.message : error);
  }
}

export async function closeRedis(): Promise<void> {
  if (!redis) return;
  await redis.quit();
  redis = null;
}
