import { NextResponse } from "next/server";
import { readMinInitialBuyBnb } from "@/lib/meme-factory-onchain";

export async function GET() {
  try {
    const minInitialBuyBnb = await readMinInitialBuyBnb();
    return NextResponse.json(
      { data: { minInitialBuyBnb } },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
