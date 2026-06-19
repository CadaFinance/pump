import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createKernelAccount,
  KernelEIP1193Provider,
  type KernelAccountClient,
} from "@zerodev/sdk";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, EIP1193Provider, Hex } from "viem";
import {
  createKernelClientFromAccount,
  createPumpPublicClient,
  entryPoint,
  kernelVersion,
} from "@/lib/aa/kernel-account";

export type EmailKernelSession = {
  email: string;
  eoaAddress: Address;
  scwAddress: Address;
  kernelClient: KernelAccountClient;
  provider: EIP1193Provider;
};

export async function deriveEmailWalletAddresses(privateKey: Hex): Promise<{
  eoaAddress: Address;
  scwAddress: Address;
}> {
  const publicClient = createPumpPublicClient();
  const localAccount = privateKeyToAccount(privateKey);

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: localAccount,
    entryPoint,
    kernelVersion,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion,
  });

  return {
    eoaAddress: localAccount.address,
    scwAddress: account.address,
  };
}

export async function buildEmailKernelSession(
  email: string,
  privateKey: Hex
): Promise<EmailKernelSession> {
  const publicClient = createPumpPublicClient();
  const localAccount = privateKeyToAccount(privateKey);

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: localAccount,
    entryPoint,
    kernelVersion,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: ecdsaValidator },
    entryPoint,
    kernelVersion,
  });

  const kernelClient = createKernelClientFromAccount(account, publicClient);
  const provider = new KernelEIP1193Provider(kernelClient) as EIP1193Provider;

  return {
    email,
    eoaAddress: localAccount.address,
    scwAddress: account.address,
    kernelClient,
    provider,
  };
}
