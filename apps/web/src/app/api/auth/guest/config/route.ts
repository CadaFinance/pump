import { NextResponse } from "next/server";
import { isGuestAuthEnabled } from "@/lib/auth/guest-auth";

export async function GET() {
  return NextResponse.json(
    { data: { enabled: isGuestAuthEnabled() } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
