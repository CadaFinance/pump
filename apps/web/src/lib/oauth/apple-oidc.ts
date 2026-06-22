import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT, type JWTPayload } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type AppleOidcProfile = {
  subject: string;
  email: string | null;
  displayName: string | null;
};

export function getAppleOauthClientId(): string {
  return process.env.NEXT_PUBLIC_APPLE_OAUTH_CLIENT_ID?.trim() ?? "";
}

export function getAppleTeamId(): string {
  return process.env.APPLE_TEAM_ID?.trim() ?? "";
}

export function getAppleKeyId(): string {
  return process.env.APPLE_KEY_ID?.trim() ?? "";
}

function getApplePrivateKeyPem(): string {
  const raw = process.env.APPLE_PRIVATE_KEY?.trim() ?? "";
  if (!raw) return "";
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function isAppleOidcRedirectConfigured(): boolean {
  return Boolean(
    getAppleOauthClientId() &&
      getAppleTeamId() &&
      getAppleKeyId() &&
      getApplePrivateKeyPem()
  );
}

export function getAppleOauthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/apple/callback`;
}

export async function createAppleClientSecret(): Promise<string> {
  const clientId = getAppleOauthClientId();
  const teamId = getAppleTeamId();
  const keyId = getAppleKeyId();
  const privateKeyPem = getApplePrivateKeyPem();

  if (!clientId || !teamId || !keyId || !privateKeyPem) {
    throw new Error("Apple Sign In is not configured on the server.");
  }

  const key = await importPKCS8(privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .setAudience(APPLE_ISSUER)
    .setSubject(clientId)
    .sign(key);
}

export function buildAppleOauthAuthUrl(input: {
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
    response_mode: "query",
    scope: "name email",
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function exchangeAppleAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ idToken: string }> {
  const clientId = getAppleOauthClientId();
  if (!clientId) throw new Error("Apple OAuth client id is not configured.");

  const clientSecret = await createAppleClientSecret();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Apple token exchange failed.");
  }

  return { idToken: payload.id_token };
}

export function appleProfileFromClaims(payload: JWTPayload): AppleOidcProfile | null {
  const subject = typeof payload.sub === "string" ? payload.sub : null;
  if (!subject) return null;

  const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  return { subject, email, displayName: email };
}

export async function verifyAppleIdToken(
  idToken: string,
  expectedNonce?: string
): Promise<AppleOidcProfile> {
  const clientId = getAppleOauthClientId();
  if (!clientId) throw new Error("Apple OAuth client id is not configured.");

  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: clientId,
  });

  if (expectedNonce) {
    const tokenNonce = typeof payload.nonce === "string" ? payload.nonce : null;
    if (!tokenNonce || tokenNonce !== expectedNonce) {
      throw new Error("Apple login nonce mismatch.");
    }
  }

  const profile = appleProfileFromClaims(payload);
  if (!profile) throw new Error("Apple ID token is missing a valid subject.");
  return profile;
}

export const APPLE_OIDC_COOKIE = "pump_apple_oidc";
export const APPLE_OIDC_COOKIE_MAX_AGE_SECONDS = 600;
