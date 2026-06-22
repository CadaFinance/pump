import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";

export async function GET(request: NextRequest) {
  const wallet = requireAdminWallet(request);
  if (!wallet) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json(
    { data: { address: wallet } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
