import { generatePrivateKey } from "viem/accounts";
import type { Hex } from "viem";
import { deriveWalletAddresses } from "@/lib/aa/kernel-session";
import {
  getOAuthWallet,
  insertOAuthWallet,
  updateOAuthProfile,
  type OAuthProvider,
} from "@/lib/db/oauth-wallets";

export type OAuthWalletCredentials = {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  displayName: string | null;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
};

export async function getOrCreateOAuthWallet(input: {
  provider: OAuthProvider;
  subject: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<OAuthWalletCredentials> {
  const existing = await getOAuthWallet(input.provider, input.subject);
  if (existing) {
    await updateOAuthProfile(input.provider, input.subject, {
      email: input.email,
      displayName: input.displayName,
    });
    return existing;
  }

  const privateKey = generatePrivateKey();
  const { eoaAddress, scwAddress } = await deriveWalletAddresses(privateKey);

  return insertOAuthWallet({
    provider: input.provider,
    subject: input.subject,
    email: input.email,
    displayName: input.displayName,
    eoaAddress,
    scwAddress,
    privateKey,
  });
}
