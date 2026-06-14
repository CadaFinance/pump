import { NextResponse } from "next/server";
import { getMinInitialBuyBnb } from "@/lib/db/platform-settings";

export async function GET() {
  try {
    const minInitialBuyBnb = await getMinInitialBuyBnb();
    return NextResponse.json(
      { data: { minInitialBuyBnb } },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
