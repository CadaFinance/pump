import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchBnbUsdPrice } from "@/lib/bnb-price-server";
import {
  getArenaFilterCounts,
  getKothSummary,
  listTokensPaginated,
  listTopTokensByMcap,
  type ArenaListMeta,
  type ArenaListSort,
  type KothSummary,
  type TokenListItem,
} from "@/lib/db/launchpad";
import { RECENT_STRIP_DESKTOP } from "@/lib/recent-strip-limits";

const CACHE_MS = 2_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;
const TOP_MCAP_LIMIT = 20;

type TokensCacheEntry = {
  expiresAt: number;
  data: TokenListItem[];
  topByMcap: TokenListItem[];
  koth: KothSummary | null;
  meta: ArenaListMeta;
  bnbUsd: number | null;
};

const tokensCache = new Map<string, TokensCacheEntry>();

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseSort(value: string | null): ArenaListSort {
  return value === "mcap" ? "mcap" : "age";
}

function parseAirdropAddresses(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter((address) => /^0x[a-f0-9]{40}$/.test(address));
}

function cacheKey(limit: number, sort: ArenaListSort, airdropKey: string): string {
  return `${limit}:${sort}:${airdropKey}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const sort = parseSort(searchParams.get("sort"));
    const airdropAddresses = parseAirdropAddresses(searchParams.get("airdrop"));
    const airdropKey = airdropAddresses.join("|");
    const key = cacheKey(limit, sort, airdropKey);
    const now = Date.now();
    const cached = tokensCache.get(key);

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(
        {
          data: cached.data,
          topByMcap: cached.topByMcap,
          koth: cached.koth,
          meta: cached.meta,
          bnbUsd: cached.bnbUsd,
        },
        { headers: { "Cache-Control": "private, max-age=2" } }
      );
    }

    const [tokens, topByMcap, koth, filterCounts, bnbPrice] = await Promise.all([
      listTokensPaginated({ limit, offset: 0, sort }),
      listTopTokensByMcap(TOP_MCAP_LIMIT),
      getKothSummary(RECENT_STRIP_DESKTOP),
      getArenaFilterCounts(airdropAddresses),
      fetchBnbUsdPrice(),
    ]);

    const meta: ArenaListMeta = {
      total: filterCounts.all,
      limit,
      hasMore: limit < filterCounts.all,
      filterCounts,
    };

    tokensCache.set(key, {
      expiresAt: now + CACHE_MS,
      data: tokens,
      topByMcap,
      koth,
      meta,
      bnbUsd: bnbPrice.bnbUsd,
    });

    return NextResponse.json(
      {
        data: tokens,
        topByMcap,
        koth,
        meta,
        bnbUsd: bnbPrice.bnbUsd,
      },
      { headers: { "Cache-Control": "private, max-age=2" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
