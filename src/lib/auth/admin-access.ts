import type { NextRequest } from "next/server";
import { isAdminWallet } from "@/config/admin";

/** Server: admin wallet must match NEXT_PUBLIC_ADMIN_ADDRESS. */
export function requireAdminWallet(request: NextRequest): string | null {
  const wallet =
    request.nextUrl.searchParams.get("address")?.trim() ??
    request.headers.get("x-admin-address")?.trim();
  if (!isAdminWallet(wallet ?? undefined)) return null;
  return wallet!.toLowerCase();
}
