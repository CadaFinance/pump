import { Redis } from "ioredis";
let redis = null;
const STREAM_MAX_LEN = 200;
function redisEnabled() {
    return process.env.REDIS_PUBLISH_ENABLED === "true" && Boolean(process.env.REDIS_URL?.trim());
}
function getRedis() {
    if (!redisEnabled())
        return null;
    if (!redis) {
        const url = process.env.REDIS_URL.trim();
        redis = new Redis(url, {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            enableOfflineQueue: false,
        });
        redis.on("error", (error) => {
            console.warn("redis publish error:", error.message);
        });
    }
    return redis;
}
async function publishToRooms(channel, rooms, payload) {
    const client = getRedis();
    if (!client)
        return;
    const message = JSON.stringify(payload);
    try {
        if (client.status !== "ready") {
            await client.connect();
        }
        await client.publish(channel, message);
        for (const room of rooms) {
            await client.xadd(`pump:stream:${room}`, "MAXLEN", "~", String(STREAM_MAX_LEN), "*", "p", message);
        }
    }
    catch (error) {
        console.warn("redis publish failed:", error instanceof Error ? error.message : error);
    }
}
async function nextTradeSeq(tokenAddress) {
    const client = getRedis();
    if (!client)
        return undefined;
    try {
        if (client.status !== "ready") {
            await client.connect();
        }
        const seq = await client.incr(`pump:seq:trade:${tokenAddress.toLowerCase()}`);
        return seq;
    }
    catch {
        return undefined;
    }
}
export async function publishTrade(payload) {
    const token = payload.tokenAddress.toLowerCase();
    const seq = await nextTradeSeq(token);
    const enriched = {
        ...payload,
        seq,
        bonding: {
            ...payload.bonding,
            spotPriceZug: payload.bonding.spotPriceZug ?? payload.bonding.lastPriceZug,
        },
    };
    const channel = `pump:trade:${token}`;
    const rooms = [`token:${token}`, "arena"];
    await publishToRooms(channel, rooms, enriched);
}
export async function publishWalletTrade(payload) {
    const wallet = payload.walletAddress.toLowerCase();
    const token = payload.tokenAddress.toLowerCase();
    const seq = await nextTradeSeq(token);
    const enriched = {
        ...payload,
        seq,
        bonding: {
            ...payload.bonding,
            spotPriceZug: payload.bonding.spotPriceZug ?? payload.bonding.lastPriceZug,
        },
    };
    const channel = `pump:wallet:${wallet}`;
    await publishToRooms(channel, [`wallet:${wallet}`], enriched);
}
export async function publishKoth(payload) {
    const client = getRedis();
    if (!client)
        return;
    const message = JSON.stringify({ type: "koth", ...payload });
    try {
        if (client.status !== "ready") {
            await client.connect();
        }
        await client.publish("pump:koth", message);
        await client.xadd("pump:stream:arena", "MAXLEN", "~", String(STREAM_MAX_LEN), "*", "p", message);
    }
    catch (error) {
        console.warn("redis publish koth failed:", error instanceof Error ? error.message : error);
    }
}
export async function closeRedis() {
    if (!redis)
        return;
    await redis.quit();
    redis = null;
}
