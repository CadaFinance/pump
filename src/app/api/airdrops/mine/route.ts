import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { listMyAirdropParticipations, refreshParticipantSnapshot } from "@/lib/db/airdrops";
import { needsLiveAirdropRefresh } from "@/lib/portfolio-airdrop-summary";

const REFRESH_CAP = 20;

function pickForProgressRefresh(
  items: Awaited<ReturnType<typeof listMyAirdropParticipations>>
) {
  const active = items.filter(needsLiveAirdropRefresh);
  if (active.length > 0) return active.slice(0, REFRESH_CAP);
  return items.filter((item) => item.displayStatus !== "CLOSED" && !item.claimedAt).slice(0, REFRESH_CAP);
}

export async function GET(request: NextRequest) {
  const address = normalizeAddressParam(request.nextUrl.searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "Valid address query param is required" }, { status: 400 });
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(500, Math.max(1, Number(limitRaw) || 20)) : 20;
  const refresh =
    request.nextUrl.searchParams.get("refresh") === "1" ||
    request.nextUrl.searchParams.get("refresh") === "true";
  const idsOnly =
    request.nextUrl.searchParams.get("idsOnly") === "1" ||
    request.nextUrl.searchParams.get("idsOnly") === "true";

  try {
    let data = await listMyAirdropParticipations(address, limit);

    if (idsOnly) {
      return NextResponse.json({
        data: data.map((row) => ({ id: row.id })),
      });
    }

    if (refresh && data.length > 0) {
      const targets = pickForProgressRefresh(data);
      await Promise.all(
        targets.map((item) =>
          refreshParticipantSnapshot(item.id, address).catch(() => undefined)
        )
      );
      data = await listMyAirdropParticipations(address, limit);
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
