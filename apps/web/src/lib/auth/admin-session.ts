import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/auth/session-cookie";

export const ADMIN_AUTH_COOKIE = "pump_admin_auth";
export const ADMIN_SIWE_NONCE_COOKIE = "pump_admin_siwe_nonce";

const DEFAULT_ADMIN_SESSION_MAX_AGE_SEC = 24 * 60 * 60;
const NONCE_MAX_AGE_SEC = 5 * 60;

function adminSessionMaxAgeSec(): number {
  const raw = process.env.ADMIN_SESSION_MAX_AGE_SEC?.trim();
  if (!raw) return DEFAULT_ADMIN_SESSION_MAX_AGE_SEC;
  const n = Number(raw);
  return Number.isFinite(n) && n > 60 ? Math.floor(n) : DEFAULT_ADMIN_SESSION_MAX_AGE_SEC;
}

function sessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (secret && secret !== "CHANGE_ME") return secret;
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (botToken && botToken !== "CHANGE_ME") return botToken;
  throw new Error("AUTH_SESSION_SECRET or TELEGRAM_BOT_TOKEN is required");
}

export function createAdminSessionToken(address: string): string {
  const normalized = address.toLowerCase();
  const expiresAt = Math.floor(Date.now() / 1000) + adminSessionMaxAgeSec();
  const payload = `${normalized}:${expiresAt}`;
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}:${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const lastColon = token.lastIndexOf(":");
  if (lastColon <= 0) return null;

  const payload = token.slice(0, lastColon);
  const signature = token.slice(lastColon + 1);
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  const [address, expiresAtRaw] = payload.split(":");
  const expiresAt = Number(expiresAtRaw);
  if (!address || !/^0x[a-f0-9]{40}$/.test(address) || !Number.isFinite(expiresAt)) return null;
  if (Math.floor(Date.now() / 1000) > expiresAt) return null;
  return address;
}

export function createSiweNonce(): string {
  return randomBytes(16).toString("hex");
}

export function adminAuthCookieOptions(request?: Pick<NextRequest, "headers" | "nextUrl">) {
  return {
    ...authCookieOptions(request),
    maxAge: adminSessionMaxAgeSec(),
  };
}

export function adminNonceCookieOptions(request?: Pick<NextRequest, "headers" | "nextUrl">) {
  return {
    ...authCookieOptions(request),
    maxAge: NONCE_MAX_AGE_SEC,
  };
}
