import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import { persistCreatorFeeClaimFromTx } from "@/lib/record-creator-fee-claim";

/** POST /api/portfolio/creator-fees/record — save claim tx after UI claim. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { txHash?: string; creatorAddress?: string };
    const txHash = body.txHash?.trim().toLowerCase();
    const creatorAddress = normalizeAddressParam(body.creatorAddress ?? null);

    if (!txHash || !/^0x[a-f0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Valid txHash required" }, { status: 400 });
    }
    if (!creatorAddress) {
      return NextResponse.json({ error: "Valid creatorAddress required" }, { status: 400 });
    }

    const result = await persistCreatorFeeClaimFromTx(txHash, creatorAddress);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record claim";
    console.error("[portfolio/creator-fees/record]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
