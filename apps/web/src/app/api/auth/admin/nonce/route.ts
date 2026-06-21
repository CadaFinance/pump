import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminWallet } from "@/config/admin";
import { CHAIN_ID } from "@/config/chain";
import {
  ADMIN_SIWE_NONCE_COOKIE,
  adminNonceCookieOptions,
  createSiweNonce,
} from "@/lib/auth/admin-session";
import { buildAdminSiweMessage, requestOrigin } from "@/lib/auth/admin-siwe";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();
  if (!isAdminWallet(address ?? undefined)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nonce = createSiweNonce();
  const { domain, uri } = requestOrigin(request);
  const message = buildAdminSiweMessage({
    domain,
    address: address!,
    uri,
    chainId: CHAIN_ID,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  const response = NextResponse.json({ data: { message, nonce } });
  response.cookies.set(ADMIN_SIWE_NONCE_COOKIE, nonce, adminNonceCookieOptions(request));
  return response;
}
