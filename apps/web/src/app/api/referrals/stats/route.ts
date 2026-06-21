import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { getReferralStats } from "@/lib/db/launchpad";

/** GET /api/referrals/stats?address= — invite count, referral volume, claimed BNB. */
export async function GET(request: NextRequest) {
  try {
    const address = normalizeAddressParam(request.nextUrl.searchParams.get("address"));
    if (!address) {
      return NextResponse.json({ error: "Valid address required" }, { status: 400 });
    }

    const stats = await getReferralStats(address);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load referral stats";
    console.error("[referrals/stats]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
