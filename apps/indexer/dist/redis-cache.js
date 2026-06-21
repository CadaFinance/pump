import { Redis } from "ioredis";
let redis = null;
function redisCacheEnabled() {
    return (process.env.REDIS_CACHE_ENABLED !== "false" &&
        Boolean(process.env.REDIS_URL?.trim()) &&
        (process.env.REDIS_PUBLISH_ENABLED === "true" ||
            process.env.REDIS_CACHE_ENABLED === "true"));
}
function getRedis() {
    if (!redisCacheEnabled())
        return null;
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL.trim(), {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            enableOfflineQueue: false,
        });
        redis.on("error", (error) => {
            console.warn("redis cache error:", error.message);
        });
    }
    return redis;
}
const HOT_ARENA_CACHE_KEYS = [
    "pump:cache:arena:new:age:desc:50",
    "pump:cache:arena:all:mcap:desc:50",
    "pump:cache:arena:all:age:desc:50",
    "pump:cache:top:mcap:20",
    "pump:cache:filter:counts",
];
export function arenaCacheKey(parts) {
    const airdrop = parts.airdropKey ? `:${parts.airdropKey}` : "";
    return `pump:cache:arena:${parts.filter}:${parts.sortKey}:${parts.sortDir}:${parts.limit}${airdrop}`;
}
export function topMcapCacheKey(limit) {
    return `pump:cache:top:mcap:${limit}`;
}
export function tokenSnapshotCacheKey(tokenAddress) {
    return `pump:cache:token:${tokenAddress.toLowerCase()}`;
}
export async function setCacheJson(key, payload, ttlSeconds) {
    const client = getRedis();
    if (!client)
        return;
    try {
        if (client.status !== "ready")
            await client.connect();
        await client.set(key, JSON.stringify(payload), "EX", ttlSeconds);
    }
    catch (error) {
        console.warn("redis set cache failed:", error instanceof Error ? error.message : error);
    }
}
export async function invalidateArenaCaches(tokenAddress) {
    const client = getRedis();
    if (!client)
        return;
    try {
        if (client.status !== "ready")
            await client.connect();
        const keys = [...HOT_ARENA_CACHE_KEYS];
        if (tokenAddress) {
            keys.push(tokenSnapshotCacheKey(tokenAddress));
        }
        if (keys.length > 0) {
            await client.del(...keys);
        }
    }
    catch (error) {
        console.warn("redis invalidate cache failed:", error instanceof Error ? error.message : error);
    }
}
export async function closeRedisCache() {
    if (!redis)
        return;
    await redis.quit();
    redis = null;
}
