import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/auth/session-cookie";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...authCookieOptions(request),
    maxAge: 0,
  });
  return response;
}
