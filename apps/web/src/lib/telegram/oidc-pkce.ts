import { createHash, randomBytes } from "crypto";

function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createOidcState(): string {
  return base64UrlEncode(randomBytes(24));
}

export function createOidcNonce(): string {
  return base64UrlEncode(randomBytes(24));
}

export function createPkceVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function createPkceChallenge(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}
