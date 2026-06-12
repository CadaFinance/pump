import { NextResponse } from "next/server";
import { getAirdropById, getAirdropLeaderboard } from "@/lib/db/airdrops";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const airdrop = await getAirdropById(id);
    if (!airdrop) {
      return NextResponse.json({ error: "Airdrop not found" }, { status: 404 });
    }
    if (airdrop.status === "FINALIZED" || airdrop.merkleRoot) {
      return NextResponse.json({ error: "Leaderboard closed after finalize" }, { status: 400 });
    }

    const data = await getAirdropLeaderboard(id);
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
