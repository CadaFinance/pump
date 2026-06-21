import type { NextRequest } from "next/server";
import { isAdminWallet } from "@/config/admin";
import { ADMIN_AUTH_COOKIE, verifyAdminSessionToken } from "@/lib/auth/admin-session";

/** Server: valid SIWE session cookie + ops wallet allow-list. */
export function requireAdminWallet(request: NextRequest): string | null {
  const wallet = verifyAdminSessionToken(request.cookies.get(ADMIN_AUTH_COOKIE)?.value);
  if (!wallet || !isAdminWallet(wallet)) return null;
  return wallet.toLowerCase();
}
