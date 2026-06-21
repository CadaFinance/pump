import type { ArenaHomeFetchOptions, ArenaHomePayload } from "@/lib/arena-server";
import { readCacheJson, writeCacheJson } from "@/lib/redis/client";

const ARENA_CACHE_TTL_SEC = 2;

export function buildArenaCacheKey(options: ArenaHomeFetchOptions): string {
  const limit = options.limit ?? 50;
  const sortKey = options.sortKey ?? "age";
  const sortDir = options.sortDir ?? "desc";
  const filter = options.filter ?? "new";
  const airdropKey =
    options.airdropAddresses && options.airdropAddresses.length > 0
      ? `:${options.airdropAddresses.join("|")}`
      : "";
  return `pump:cache:arena:${filter}:${sortKey}:${sortDir}:${limit}${airdropKey}`;
}

export function buildTopMcapCacheKey(limit: number): string {
  return `pump:cache:top:mcap:${limit}`;
}

export async function readArenaHomeCache(
  options: ArenaHomeFetchOptions
): Promise<ArenaHomePayload | null> {
  return readCacheJson<ArenaHomePayload>(buildArenaCacheKey(options));
}

export async function writeArenaHomeCache(
  options: ArenaHomeFetchOptions,
  payload: ArenaHomePayload
): Promise<void> {
  await writeCacheJson(buildArenaCacheKey(options), payload, ARENA_CACHE_TTL_SEC);
}

export async function readTopMcapCache(
  limit: number
): Promise<ArenaHomePayload["topByMcap"] | null> {
  return readCacheJson<ArenaHomePayload["topByMcap"]>(buildTopMcapCacheKey(limit));
}

export async function writeTopMcapCache(
  limit: number,
  topByMcap: ArenaHomePayload["topByMcap"]
): Promise<void> {
  await writeCacheJson(buildTopMcapCacheKey(limit), topByMcap, ARENA_CACHE_TTL_SEC);
}
