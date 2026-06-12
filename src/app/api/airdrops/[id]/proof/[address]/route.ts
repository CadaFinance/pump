import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getAirdropProof } from "@/lib/db/airdrops";

type RouteContext = { params: Promise<{ id: string; address: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id, address: rawAddress } = await context.params;
    const address = normalizeAddressParam(rawAddress);
    if (!address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const data = await getAirdropProof(id, address);
    if (!data) {
      return NextResponse.json({ error: "No allocation for address" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
