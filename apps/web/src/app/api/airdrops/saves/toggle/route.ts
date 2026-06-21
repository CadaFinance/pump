import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { toggleAirdropSave } from "@/lib/db/airdrops";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      airdropId?: string;
    };

    const address = normalizeAddressParam(body.address);
    const airdropId = body.airdropId?.trim();

    if (!address || !airdropId || !/^\d+$/.test(airdropId)) {
      return NextResponse.json(
        { error: "Valid address and airdropId are required" },
        { status: 400 }
      );
    }

    const saved = await toggleAirdropSave(address, airdropId);
    return NextResponse.json({ data: { saved } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Airdrop not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status: status });
  }
}
