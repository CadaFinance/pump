import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTokenByAddress, listTokenHolders } from "@/lib/db/launchpad";
import { fetchOnChainTokenBalancesForHolders } from "@/lib/portfolio-onchain";

type RouteContext = { params: Promise<{ address: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { address } = await context.params;

  try {
    const token = await getTokenByAddress(address);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const holders = await listTokenHolders(address, 300);
    const onChain = await fetchOnChainTokenBalancesForHolders(
      address,
      holders.map((holder) => holder.address)
    );

    const data = holders.map((holder) => ({
      ...holder,
      onChainBalance: onChain.get(holder.address.toLowerCase()) ?? "0",
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
