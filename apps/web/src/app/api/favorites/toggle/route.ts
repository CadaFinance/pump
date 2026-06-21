import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { toggleTokenFavorite } from "@/lib/db/launchpad";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      address?: string;
      tokenAddress?: string;
    };

    const address = normalizeAddressParam(body.address);
    const tokenAddress = normalizeAddressParam(body.tokenAddress);

    if (!address || !tokenAddress) {
      return NextResponse.json(
        { error: "Valid address and tokenAddress are required" },
        { status: 400 }
      );
    }

    const favorited = await toggleTokenFavorite(address, tokenAddress);
    return NextResponse.json({ data: { favorited } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Token not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
