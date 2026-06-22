import type { OAuthProvider } from "@/lib/db/oauth-wallets";

export type SessionSubject =
  | { kind: "telegram"; telegramId: string }
  | { kind: "oauth"; provider: OAuthProvider; subject: string };

function encodePart(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodePart(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

/** Cookie payload subject — no colons (legacy telegram ids are numeric). */
export function sessionSubjectToTokenKey(subject: SessionSubject): string {
  if (subject.kind === "telegram") return subject.telegramId;
  return `${subject.provider}.${encodePart(subject.subject)}`;
}

export function parseSessionSubjectFromTokenKey(raw: string): SessionSubject | null {
  if (!raw) return null;

  if (raw.startsWith("google.")) {
    try {
      return { kind: "oauth", provider: "google", subject: decodePart(raw.slice(7)) };
    } catch {
      return null;
    }
  }

  if (raw.startsWith("apple.")) {
    try {
      return { kind: "oauth", provider: "apple", subject: decodePart(raw.slice(6)) };
    } catch {
      return null;
    }
  }

  if (/^\d+$/.test(raw)) {
    return { kind: "telegram", telegramId: raw };
  }

  return null;
}
