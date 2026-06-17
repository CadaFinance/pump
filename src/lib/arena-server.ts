import { fetchBnbUsdPrice } from "@/lib/bnb-price-server";
import {
  getArenaFilterCounts,
  getKothSummary,
  listArenaBoardTokens,
  listTopTokensByMcap,
  type ArenaBoardFilter,
  type ArenaBoardSortDir,
  type ArenaBoardSortKey,
  type ArenaFilterCounts,
  type ArenaListMeta,
  type KothSummary,
  type TokenListItem,
} from "@/lib/db/launchpad";
import { RECENT_STRIP_DESKTOP } from "@/lib/recent-strip-limits";

export const ARENA_HOME_LIMIT = 50;
const TOP_MCAP_LIMIT = 20;

export type ArenaHomePayload = {
  data: TokenListItem[];
  topByMcap: TokenListItem[];
  koth: KothSummary | null;
  meta: ArenaListMeta;
  bnbUsd: number | null;
};

function filterCountKey(
  filter: ArenaBoardFilter
): keyof ArenaFilterCounts {
  if (filter === "movers") return "movers";
  if (filter === "kothContenders") return "kothContenders";
  if (filter === "hasAirdrop") return "hasAirdrop";
  if (filter === "new") return "new";
  return "all";
}

export type ArenaHomeFetchOptions = {
  limit?: number;
  sortKey?: ArenaBoardSortKey;
  sortDir?: ArenaBoardSortDir;
  filter?: ArenaBoardFilter;
  airdropAddresses?: string[];
};

/** Server-side arena board payload — SSR home page + shared with /api/tokens. */
export async function fetchArenaHomePayload(
  options: ArenaHomeFetchOptions = {}
): Promise<ArenaHomePayload> {
  const limit = options.limit ?? ARENA_HOME_LIMIT;
  const sortKey = options.sortKey ?? "age";
  const sortDir = options.sortDir ?? "desc";
  const filter = options.filter ?? "new";
  const airdropAddresses = options.airdropAddresses ?? [];

  const [tokens, topByMcap, koth, filterCounts, bnbPrice] = await Promise.all([
    listArenaBoardTokens({
      limit,
      offset: 0,
      sortKey,
      sortDir,
      filter,
      airdropAddresses,
    }),
    listTopTokensByMcap(TOP_MCAP_LIMIT),
    getKothSummary(RECENT_STRIP_DESKTOP),
    getArenaFilterCounts(airdropAddresses),
    fetchBnbUsdPrice(),
  ]);

  const filteredTotal = filterCounts[filterCountKey(filter)];
  const meta: ArenaListMeta = {
    total: filterCounts.all,
    limit,
    hasMore: limit < filteredTotal,
    filterCounts,
  };

  return {
    data: tokens,
    topByMcap,
    koth,
    meta,
    bnbUsd: bnbPrice.bnbUsd,
  };
}
