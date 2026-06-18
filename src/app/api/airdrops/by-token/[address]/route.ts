import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getActiveAirdropForLinkedToken } from "@/lib/db/airdrops";

type RouteProps = { params: Promise<{ address: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const { address } = await params;
  const normalized = normalizeAddressParam(address);
  if (!normalized) {
    return NextResponse.json({ error: "Valid token address required" }, { status: 400 });
  }

  try {
    const data = await getActiveAirdropForLinkedToken(normalized);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
