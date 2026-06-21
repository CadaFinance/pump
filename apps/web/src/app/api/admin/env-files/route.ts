import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminWallet } from "@/lib/auth/admin-access";
import { listAdminEnvFiles } from "@/lib/admin/env-files";

export async function GET(request: NextRequest) {
  if (!requireAdminWallet(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await listAdminEnvFiles();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list env files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
