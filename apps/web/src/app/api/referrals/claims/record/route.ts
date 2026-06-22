import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { ensureDynamicRoute } from "@/lib/api/route-dynamic";
import { persistReferrerFeeClaimFromTx } from "@/lib/record-referrer-fee-claim";

/** POST /api/referrals/claims/record — save referrer claim tx after UI claim. */
export async function POST(request: NextRequest) {
  await ensureDynamicRoute();

  try {
    const body = (await request.json()) as { txHash?: string; referrerAddress?: string };
    const txHash = body.txHash?.trim().toLowerCase();
    const referrerAddress = normalizeAddressParam(body.referrerAddress ?? null);

    if (!txHash || !/^0x[a-f0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Valid txHash required" }, { status: 400 });
    }
    if (!referrerAddress) {
      return NextResponse.json({ error: "Valid referrerAddress required" }, { status: 400 });
    }

    const result = await persistReferrerFeeClaimFromTx(txHash, referrerAddress);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record claim";
    console.error("[referrals/claims/record]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
