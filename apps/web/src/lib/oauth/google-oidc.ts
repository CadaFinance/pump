import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleOidcProfile = {
  subject: string;
  email: string | null;
  displayName: string | null;
};

export function getGoogleOauthClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
}

export function getGoogleOauthClientSecret(): string {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
}

export function isGoogleOidcRedirectConfigured(): boolean {
  return Boolean(getGoogleOauthClientId() && getGoogleOauthClientSecret());
}

export function getGoogleOauthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function buildGoogleOauthAuthUrl(input: {
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
    scope: "openid email profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(input: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<{ idToken: string }> {
  const clientId = getGoogleOauthClientId();
  const clientSecret = getGoogleOauthClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured on the server.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
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
    throw new Error(payload.error_description ?? payload.error ?? "Google token exchange failed.");
  }

  return { idToken: payload.id_token };
}

export function googleProfileFromClaims(payload: JWTPayload): GoogleOidcProfile | null {
  const subject = typeof payload.sub === "string" ? payload.sub : null;
  if (!subject) return null;

  const email =
    typeof payload.email === "string" && payload.email_verified !== false
      ? payload.email.toLowerCase()
      : typeof payload.email === "string"
        ? payload.email.toLowerCase()
        : null;

  const displayName =
    typeof payload.name === "string"
      ? payload.name.trim()
      : typeof payload.given_name === "string"
        ? payload.given_name.trim()
        : null;

  return { subject, email, displayName: displayName || null };
}

export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce?: string
): Promise<GoogleOidcProfile> {
  const clientId = getGoogleOauthClientId();
  if (!clientId) throw new Error("Google OAuth client id is not configured.");

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });

  if (expectedNonce) {
    const tokenNonce = typeof payload.nonce === "string" ? payload.nonce : null;
    if (!tokenNonce || tokenNonce !== expectedNonce) {
      throw new Error("Google login nonce mismatch.");
    }
  }

  const profile = googleProfileFromClaims(payload);
  if (!profile) throw new Error("Google ID token is missing a valid subject.");
  return profile;
}

export const GOOGLE_OIDC_COOKIE = "pump_google_oidc";
export const GOOGLE_OIDC_COOKIE_MAX_AGE_SECONDS = 600;
