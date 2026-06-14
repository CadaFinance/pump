import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getAirdropProgress, refreshParticipantSnapshot } from "@/lib/db/airdrops";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const address = normalizeAddressParam(request.nextUrl.searchParams.get("address") ?? undefined);
    if (!address) {
      return NextResponse.json({ error: "address query param is required" }, { status: 400 });
    }

    await refreshParticipantSnapshot(id, address).catch(() => undefined);

    const data = await getAirdropProgress(id, address);
    if (!data) {
      return NextResponse.json({ error: "Airdrop not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
