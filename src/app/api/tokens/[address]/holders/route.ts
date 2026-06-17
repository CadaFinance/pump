import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTokenByAddress, listTokenHolders } from "@/lib/db/launchpad";
import { fetchOnChainTokenBalancesForHolders } from "@/lib/portfolio-onchain";
import { getHoldersCache, holdersCacheKey, setHoldersCache } from "@/lib/holders-cache";

type RouteContext = { params: Promise<{ address: string }> };

type HolderResponse = Array<{
  address: string;
  tokenBalance: string;
  totalBoughtBnb: string;
  totalSoldBnb: string;
  realizedPnlBnb: string;
  remainingCostBasisBnb: string;
  onChainBalance: string;
}>;

export async function GET(_request: NextRequest, context: RouteContext) {
  const { address } = await context.params;

  try {
    const cacheKey = holdersCacheKey(address);
    const cached = getHoldersCache<HolderResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(
        { data: cached },
        { headers: { "Cache-Control": "private, max-age=15" } }
      );
    }

    const token = await getTokenByAddress(address);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const holders = await listTokenHolders(address, 300);
    const onChain = await fetchOnChainTokenBalancesForHolders(
      address,
      holders.map((holder) => holder.address)
    );

    const data: HolderResponse = holders.map((holder) => ({
      address: holder.address,
      tokenBalance: holder.tokenBalance,
      totalBoughtBnb: holder.totalBoughtBnb,
      totalSoldBnb: holder.totalSoldBnb,
      realizedPnlBnb: holder.realizedPnlBnb,
      remainingCostBasisBnb: holder.remainingCostBasisBnb,
      onChainBalance: onChain.get(holder.address.toLowerCase()) ?? "0",
    }));

    setHoldersCache(cacheKey, data);

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, max-age=15" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
