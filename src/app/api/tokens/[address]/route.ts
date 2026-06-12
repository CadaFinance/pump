import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTokenByAddress, listTradesForToken } from "@/lib/db/launchpad";

type RouteContext = { params: Promise<{ address: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { address } = await context.params;

  try {
    const token = await getTokenByAddress(address);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const trades = await listTradesForToken(address, 100);
    return NextResponse.json({ data: { token, trades } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
