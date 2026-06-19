import type { Hex } from "viem";
import { buildEmailKernelSession, type EmailKernelSession } from "@/lib/aa/email-kernel";
import { isValidEmail, normalizeEmail } from "@/lib/aa/email-utils";

export type EmailAccountSession = EmailKernelSession;

export { isValidEmail, normalizeEmail };

export async function createEmailKernelSession(email: string): Promise<EmailAccountSession> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Enter a valid email address.");
  }

  const response = await fetch("/api/wallet/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalized }),
    cache: "no-store",
  });

  const body = (await response.json()) as {
    data?: {
      email: string;
      scwAddress: string;
      privateKey: Hex;
    };
    error?: string;
  };

  if (!response.ok || !body.data?.privateKey) {
    throw new Error(body.error ?? "Could not load wallet for this email.");
  }

  return buildEmailKernelSession(body.data.email, body.data.privateKey);
}
