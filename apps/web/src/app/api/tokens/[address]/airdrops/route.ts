import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getPrimaryOpenAirdropForToken } from "@/lib/db/airdrops";

type RouteContext = { params: Promise<{ address: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { address: tokenParam } = await context.params;
  const tokenAddress = normalizeAddressParam(tokenParam);
  if (!tokenAddress) {
    return NextResponse.json({ error: "Valid token address is required" }, { status: 400 });
  }

  try {
    const data = await getPrimaryOpenAirdropForToken(tokenAddress);
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, max-age=10" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
