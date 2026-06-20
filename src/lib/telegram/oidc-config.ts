import { getTelegramOidcRedirectUri as buildRedirectUri } from "@/lib/telegram/oidc-constants";

const TELEGRAM_OIDC_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_OIDC_JWKS_URL = `${TELEGRAM_OIDC_ISSUER}/.well-known/jwks.json`;
const TELEGRAM_OIDC_AUTH_URL = `${TELEGRAM_OIDC_ISSUER}/auth`;
const TELEGRAM_OIDC_TOKEN_URL = `${TELEGRAM_OIDC_ISSUER}/token`;

export const TELEGRAM_OIDC_COOKIE = "pump_tg_oidc";
export const TELEGRAM_OIDC_COOKIE_MAX_AGE_SECONDS = 600;

export type TelegramOidcCookiePayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
};

export function getTelegramOidcClientId(): string {
  const explicit = process.env.NEXT_PUBLIC_TELEGRAM_OIDC_CLIENT_ID?.trim();
  if (explicit) return explicit;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (token && token !== "CHANGE_ME") {
    const botId = token.split(":")[0]?.trim();
    if (botId) return botId;
  }

  return "";
}

export function getTelegramOidcClientSecret(): string {
  return process.env.TELEGRAM_OIDC_CLIENT_SECRET?.trim() ?? "";
}

export function isTelegramOidcRedirectConfigured(): boolean {
  return Boolean(getTelegramOidcClientId() && getTelegramOidcClientSecret());
}

export function getTelegramOidcRedirectUri(origin: string): string {
  return buildRedirectUri(origin);
}

export function buildTelegramOidcAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TELEGRAM_OIDC_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTelegramAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ idToken: string }> {
  const clientId = getTelegramOidcClientId();
  const clientSecret = getTelegramOidcClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Telegram OIDC redirect is not configured on the server.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: clientId,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch(TELEGRAM_OIDC_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Telegram token exchange failed.");
  }

  return { idToken: payload.id_token };
}

export { TELEGRAM_OIDC_ISSUER, TELEGRAM_OIDC_JWKS_URL };
