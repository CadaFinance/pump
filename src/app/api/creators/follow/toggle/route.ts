import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { toggleCreatorFollow } from "@/lib/db/launchpad";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      creatorAddress?: string;
    };

    const address = normalizeAddressParam(body.address);
    const creatorAddress = normalizeAddressParam(body.creatorAddress);

    if (!address || !creatorAddress) {
      return NextResponse.json(
        { error: "Valid address and creatorAddress are required" },
        { status: 400 }
      );
    }

    const following = await toggleCreatorFollow(address, creatorAddress);
    return NextResponse.json({ data: { following } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message === "Creator not found" || message === "Cannot follow yourself" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
