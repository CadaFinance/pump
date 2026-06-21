import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getOrAssignUserAvatar, setUserAvatar } from "@/lib/db/users";
import { USER_AVATAR_IDS } from "@/lib/user-avatars";

export async function GET(request: NextRequest) {
  const address = normalizeAddressParam(request.nextUrl.searchParams.get("address"));
  if (!address) {
    return NextResponse.json({ error: "Valid address query param is required" }, { status: 400 });
  }

  try {
    const avatarId = await getOrAssignUserAvatar(address);
    return NextResponse.json({ data: { avatarId, catalog: USER_AVATAR_IDS } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string; avatarId?: string };
    const address = normalizeAddressParam(body.address);
    const avatarId = body.avatarId?.trim();

    if (!address || !avatarId) {
      return NextResponse.json({ error: "Valid address and avatarId are required" }, { status: 400 });
    }

    const saved = await setUserAvatar(address, avatarId);
    return NextResponse.json({ data: { avatarId: saved } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Invalid avatar" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
