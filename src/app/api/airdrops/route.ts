import { NextResponse } from "next/server";
import { normalizeAddressParam } from "@/lib/address";
import type { AirdropRules, AirdropSocialTaskInput } from "@/lib/airdrop-rules";
import { listAirdrops, syncAirdropMetadata } from "@/lib/db/airdrops";

export async function GET() {
  try {
    const data = await listAirdrops();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, max-age=10" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      onChainId?: string;
      creatorAddress?: string;
      createTxHash?: string;
      linkedToken?: string;
      rewardToken?: string | null;
      totalFunded?: string;
      qualifyStart?: string;
      qualifyEnd?: string;
      claimStart?: string;
      claimEnd?: string;
      rules?: AirdropRules;
      rulesHash?: string;
      socialTasks?: AirdropSocialTaskInput[];
    };

    const onChainId = body.onChainId?.trim();
    const creatorAddress = normalizeAddressParam(body.creatorAddress);
    const createTxHash = body.createTxHash?.trim().toLowerCase();
    const linkedToken = normalizeAddressParam(body.linkedToken);
    const rulesHash = body.rulesHash?.trim().toLowerCase();

    if (!onChainId || !creatorAddress || !createTxHash || !linkedToken || !rulesHash || !body.rules) {
      return NextResponse.json({ error: "Missing required airdrop sync fields" }, { status: 400 });
    }

    const id = await syncAirdropMetadata({
      onChainId,
      creatorAddress,
      createTxHash,
      linkedToken,
      rewardToken: body.rewardToken ? normalizeAddressParam(body.rewardToken) : null,
      totalFunded: body.totalFunded ?? "0",
      qualifyStart: body.qualifyStart ?? new Date().toISOString(),
      qualifyEnd: body.qualifyEnd ?? new Date().toISOString(),
      claimStart: body.claimStart ?? body.qualifyEnd ?? new Date().toISOString(),
      claimEnd: body.claimEnd ?? new Date().toISOString(),
      rules: body.rules,
      rulesHash,
      socialTasks: body.socialTasks ?? [],
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
