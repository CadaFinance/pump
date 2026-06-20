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

export function telegramProfileFromClaims(payload: JWTPayload): TelegramOidcProfile | null {
  const rawId =
    typeof payload.id === "number"
      ? payload.id
      : typeof payload.sub === "string" && /^\d+$/.test(payload.sub)
        ? Number(payload.sub)
        : null;

  if (rawId == null || !Number.isFinite(rawId) || rawId <= 0) return null;

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const firstName = name ? name.split(/\s+/)[0] ?? name : null;

  return {
    telegramId: String(rawId),
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
