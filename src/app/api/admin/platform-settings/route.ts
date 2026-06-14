import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminWallet } from "@/config/admin";
import { getMinInitialBuyBnb, setMinInitialBuyBnb } from "@/lib/db/platform-settings";

function requireAdmin(request: NextRequest): string | null {
  const wallet = request.nextUrl.searchParams.get("address");
  if (!isAdminWallet(wallet ?? undefined)) return null;
  return wallet!.toLowerCase();
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const minInitialBuyBnb = await getMinInitialBuyBnb();
    return NextResponse.json(
      { data: { minInitialBuyBnb } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const wallet = requireAdmin(request);
  if (!wallet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { minInitialBuyBnb?: string };
    if (body.minInitialBuyBnb == null) {
      return NextResponse.json({ error: "minInitialBuyBnb is required" }, { status: 400 });
    }

    const saved = await setMinInitialBuyBnb(body.minInitialBuyBnb, wallet);
    return NextResponse.json({
      data: {
        minInitialBuyBnb: saved.value,
        updatedAt: saved.updatedAt,
        updatedBy: saved.updatedBy,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("valid") ||
      message.includes("required") ||
      message.includes("greater") ||
      message.includes("Maximum")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
