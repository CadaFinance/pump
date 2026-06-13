import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { fetchOnChainTokenBalancesForWallet } from "@/lib/portfolio-onchain";

/** GET /api/portfolio/onchain-balances — verify indexer positions via ERC20 balanceOf. */
export async function GET(request: NextRequest) {
  const address = normalizeAddressParam(request.nextUrl.searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "Valid address query param is required" }, { status: 400 });
  }

  const tokensParam = request.nextUrl.searchParams.get("tokens");
  const tokenAddresses = tokensParam
    ? tokensParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (tokenAddresses.length === 0) {
    return NextResponse.json({ data: {} });
  }

  try {
    const balances = await fetchOnChainTokenBalancesForWallet(address, tokenAddresses);
    const data: Record<string, string> = {};
    for (const tokenAddress of tokenAddresses) {
      data[tokenAddress.toLowerCase()] = balances.get(tokenAddress.toLowerCase()) ?? "0";
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[portfolio/onchain-balances]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
