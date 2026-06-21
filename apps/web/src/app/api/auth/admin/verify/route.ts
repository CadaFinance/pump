import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { isAdminWallet } from "@/config/admin";
import {
  ADMIN_AUTH_COOKIE,
  ADMIN_SIWE_NONCE_COOKIE,
  adminAuthCookieOptions,
  adminNonceCookieOptions,
  createAdminSessionToken,
} from "@/lib/auth/admin-session";
import { requestOrigin, verifyAdminSiweMessage } from "@/lib/auth/admin-siwe";

export async function POST(request: NextRequest) {
  let body: { message?: unknown; signature?: unknown };
  try {
    body = (await request.json()) as { message?: unknown; signature?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.message !== "string" || typeof body.signature !== "string") {
    return NextResponse.json({ error: "message and signature are required" }, { status: 400 });
  }

  const signature = body.signature.startsWith("0x")
    ? (body.signature as `0x${string}`)
    : (`0x${body.signature}` as `0x${string}`);

  if (!/^0x[0-9a-fA-F]+$/.test(signature) || signature.length < 10) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const expectedNonce = request.cookies.get(ADMIN_SIWE_NONCE_COOKIE)?.value;
  if (!expectedNonce) {
    return NextResponse.json({ error: "Sign-in session expired. Request a new message." }, { status: 401 });
  }

  const { domain } = requestOrigin(request);
  const parsed = await verifyAdminSiweMessage({
    message: body.message,
    signature,
    expectedNonce,
    expectedDomain: domain,
  });

  if (!parsed || !isAdminWallet(parsed.address)) {
    return NextResponse.json({ error: "Invalid sign-in message or signature" }, { status: 401 });
  }

  const token = createAdminSessionToken(parsed.address);
  const response = NextResponse.json({
    data: {
      address: parsed.address.toLowerCase(),
      expiresInSec: adminAuthCookieOptions(request).maxAge,
    },
  });

  response.cookies.set(ADMIN_AUTH_COOKIE, token, adminAuthCookieOptions(request));
  response.cookies.set(ADMIN_SIWE_NONCE_COOKIE, "", { ...adminNonceCookieOptions(request), maxAge: 0 });
  return response;
}
