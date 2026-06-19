import { formatEther, type Address, type PublicClient } from "viem";
import { createPumpPublicClient } from "@/lib/aa/kernel-account";

/** Minimum SCW BNB to relay a UserOp (gas) on BSC testnet without paymaster. */
export const MIN_SCW_GAS_RESERVE_WEI = 500_000_000_000_000n; // 0.0005 BNB

export async function getScwNativeBalance(
  scwAddress: Address,
  publicClient: PublicClient = createPumpPublicClient()
): Promise<bigint> {
  return publicClient.getBalance({ address: scwAddress });
}

export async function assertScwReadyForUserOp(
  scwAddress: Address,
  callValueWei: bigint
): Promise<void> {
  const balance = await getScwNativeBalance(scwAddress);
  const required = callValueWei + MIN_SCW_GAS_RESERVE_WEI;

  if (balance < required) {
    const have = formatEther(balance);
    const need = formatEther(required);
    throw new Error(
      `Smart wallet needs BNB for this trade. Have ${have} BNB, need about ${need} BNB (trade + gas) at ${scwAddress}. Deposit via Wallet → Deposit.`
    );
  }
}
