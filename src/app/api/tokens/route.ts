import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getKothSummary, listTokens, type KothSummary, type TokenListItem } from "@/lib/db/launchpad";
import { RECENT_STRIP_DESKTOP } from "@/lib/recent-strip-limits";

const CACHE_MS = 2_000;
let tokensCache: { expiresAt: number; data: TokenListItem[]; koth: KothSummary | null } | null = null;

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();
    if (tokensCache && tokensCache.expiresAt > now) {
      return NextResponse.json(
        { data: tokensCache.data, koth: tokensCache.koth },
        { headers: { "Cache-Control": "private, max-age=2" } }
      );
    }

    const [tokens, koth] = await Promise.all([listTokens(), getKothSummary(RECENT_STRIP_DESKTOP)]);
    tokensCache = { expiresAt: now + CACHE_MS, data: tokens, koth };

    return NextResponse.json(
      { data: tokens, koth },
      { headers: { "Cache-Control": "private, max-age=2" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
