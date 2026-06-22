import type { NextRequest, NextResponse } from "next/server";
import { authCookieOptions } from "@/lib/auth/session-cookie";

export type OidcFlowCookiePayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
};

export function readOidcFlowCookie(
  request: NextRequest,
  cookieName: string
): OidcFlowCookiePayload | null {
  const raw = request.cookies.get(cookieName)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OidcFlowCookiePayload;
    if (!parsed.state || !parsed.nonce || !parsed.codeVerifier || !parsed.redirectUri) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setOidcFlowCookie(
  response: NextResponse,
  request: NextRequest,
  cookieName: string,
  payload: OidcFlowCookiePayload,
  maxAgeSeconds: number
): void {
  response.cookies.set(cookieName, JSON.stringify(payload), {
    ...authCookieOptions(request),
    maxAge: maxAgeSeconds,
  });
}

export function clearOidcFlowCookie(
  response: NextResponse,
  request: NextRequest,
  cookieName: string
): void {
  response.cookies.set(cookieName, "", {
    ...authCookieOptions(request),
    maxAge: 0,
  });
}

export { createOidcNonce, createOidcState, createPkceChallenge, createPkceVerifier } from "@/lib/telegram/oidc-pkce";
