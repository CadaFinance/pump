import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  getTelegramOidcClientId,
  TELEGRAM_OIDC_ISSUER,
  TELEGRAM_OIDC_JWKS_URL,
} from "@/lib/telegram/oidc-config";

const jwks = createRemoteJWKSet(new URL(TELEGRAM_OIDC_JWKS_URL));

export type TelegramOidcProfile = {
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
};

const MAX_PG_BIGINT = 9_223_372_036_854_775_807n;

export function telegramProfileFromClaims(payload: JWTPayload): TelegramOidcProfile | null {
  let telegramId: string | null = null;
  if (typeof payload.id === "number") {
    if (!Number.isFinite(payload.id) || payload.id <= 0) return null;
    telegramId = String(Math.trunc(payload.id));
  } else if (typeof payload.id === "string" && /^\d+$/.test(payload.id)) {
    telegramId = payload.id;
  }

  if (!telegramId) return null;
  try {
    const asBigInt = BigInt(telegramId);
    if (asBigInt <= 0n || asBigInt > MAX_PG_BIGINT) return null;
  } catch {
    return null;
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const firstName = name ? name.split(/\s+/)[0] ?? name : null;

  return {
    telegramId,
    telegramUsername:
      typeof payload.preferred_username === "string" ? payload.preferred_username : null,
    firstName,
  };
}

export async function verifyTelegramIdToken(
  idToken: string,
  expectedNonce?: string
): Promise<TelegramOidcProfile> {
  const clientId = getTelegramOidcClientId();
  if (!clientId) {
    throw new Error("Telegram OIDC client id is not configured.");
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: TELEGRAM_OIDC_ISSUER,
    audience: clientId,
  });

  if (expectedNonce) {
    const tokenNonce = typeof payload.nonce === "string" ? payload.nonce : null;
    if (!tokenNonce || tokenNonce !== expectedNonce) {
      throw new Error("Telegram login nonce mismatch.");
    }
  }

  const profile = telegramProfileFromClaims(payload);
  if (!profile) {
    throw new Error("Telegram ID token is missing a valid user id.");
  }

  return profile;
}
