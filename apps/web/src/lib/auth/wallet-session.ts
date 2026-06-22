import type { Hex } from "viem";
import { getOAuthWallet } from "@/lib/db/oauth-wallets";
import { getTelegramWalletCredentials } from "@/lib/aa/telegram-wallet-server";
import {
  parseSessionSubjectFromTokenKey,
  sessionSubjectToTokenKey,
  type SessionSubject,
} from "@/lib/auth/session-subject";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session-cookie";
import type { NextRequest } from "next/server";

export type WalletSessionPayload = {
  authProvider: "telegram" | "google" | "apple";
  accountId: string;
  displayName: string | null;
  email: string | null;
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
};

export function readSessionSubject(request: NextRequest): SessionSubject | null {
  const raw = verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!raw) return null;
  return parseSessionSubjectFromTokenKey(raw);
}

export function createSessionTokenForSubject(subject: SessionSubject): string {
  return createSessionToken(sessionSubjectToTokenKey(subject));
}

export async function loadWalletSessionForSubject(
  subject: SessionSubject
): Promise<WalletSessionPayload | null> {
  if (subject.kind === "telegram") {
    const wallet = await getTelegramWalletCredentials(subject.telegramId);
    if (!wallet) return null;
    return {
      authProvider: "telegram",
      accountId: wallet.telegramId,
      displayName: wallet.firstName,
      email: null,
      telegramId: wallet.telegramId,
      telegramUsername: wallet.telegramUsername,
      firstName: wallet.firstName,
      eoaAddress: wallet.eoaAddress,
      scwAddress: wallet.scwAddress,
      privateKey: wallet.privateKey,
    };
  }

  const wallet = await getOAuthWallet(subject.provider, subject.subject);
  if (!wallet) return null;

  const displayName = wallet.displayName ?? wallet.email;

  return {
    authProvider: subject.provider,
    accountId: `${subject.provider}:${subject.subject}`,
    displayName,
    email: wallet.email,
    telegramId: "",
    telegramUsername: null,
    firstName: displayName,
    eoaAddress: wallet.eoaAddress,
    scwAddress: wallet.scwAddress,
    privateKey: wallet.privateKey,
  };
}

export async function loadWalletSessionFromRequest(
  request: NextRequest
): Promise<WalletSessionPayload | null> {
  const subject = readSessionSubject(request);
  if (!subject) return null;
  return loadWalletSessionForSubject(subject);
}
