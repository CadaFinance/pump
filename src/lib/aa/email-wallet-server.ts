import { generatePrivateKey } from "viem/accounts";
import type { Hex } from "viem";
import { deriveEmailWalletAddresses } from "@/lib/aa/email-kernel";
import { getEmailWallet, insertEmailWallet } from "@/lib/db/email-wallets";

export type EmailWalletCredentials = {
  email: string;
  eoaAddress: string;
  scwAddress: string;
  privateKey: Hex;
};

export async function getOrCreateEmailWallet(email: string): Promise<EmailWalletCredentials> {
  const existing = await getEmailWallet(email);
  if (existing) {
    return existing;
  }

  const privateKey = generatePrivateKey();
  const { eoaAddress, scwAddress } = await deriveEmailWalletAddresses(privateKey);

  return insertEmailWallet({
    email,
    eoaAddress,
    scwAddress,
    privateKey,
  });
}
