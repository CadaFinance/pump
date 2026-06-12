import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getCreatorCardData } from "@/lib/db/launchpad";

type RouteContext = { params: Promise<{ address: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { address: tokenParam } = await context.params;
  const tokenAddress = normalizeAddressParam(tokenParam);
  if (!tokenAddress) {
    return NextResponse.json({ error: "Valid token address is required" }, { status: 400 });
  }

  const viewer = normalizeAddressParam(request.nextUrl.searchParams.get("viewer"));

  try {
    const data = await getCreatorCardData(tokenAddress, viewer);
    if (!data) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
