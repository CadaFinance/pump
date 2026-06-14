import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminWallet } from "@/config/admin";
import { collectSystemHealth } from "@/lib/admin/system-health";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("address");
  if (!isAdminWallet(wallet ?? undefined)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await collectSystemHealth();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
