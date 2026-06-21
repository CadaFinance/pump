import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE, adminAuthCookieOptions } from "@/lib/auth/admin-session";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(ADMIN_AUTH_COOKIE, "", { ...adminAuthCookieOptions(request), maxAge: 0 });
  return response;
}
