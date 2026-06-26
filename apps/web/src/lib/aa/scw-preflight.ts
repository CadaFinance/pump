import { formatEther, type Address, type PublicClient } from "viem";
import { NATIVE_SYMBOL } from "@/config/chain";
import { createPumpPublicClient } from "@/lib/aa/kernel-account";
import {
  DEFAULT_BUY_CALL_GAS,
  userOpPrefundFromCallGasEstimate,
} from "@/lib/aa/user-op-prefund";

export async function getScwNativeBalance(
  scwAddress: Address,
  publicClient: PublicClient = createPumpPublicClient()
): Promise<bigint> {
  return publicClient.getBalance({ address: scwAddress });
}

export async function assertScwReadyForUserOp(
  scwAddress: Address,
  callValueWei: bigint,
  publicClient?: PublicClient,
  /** Precomputed conservative gas reserve (from instant gate / hardValidate). */
  gasReserveWei?: bigint
): Promise<void> {
  const client = publicClient ?? createPumpPublicClient();
  const balance = await getScwNativeBalance(scwAddress, client);
  const gasReserve =
    gasReserveWei != null && gasReserveWei > 0n
      ? gasReserveWei
      : userOpPrefundFromCallGasEstimate(
          DEFAULT_BUY_CALL_GAS,
          await client.getGasPrice()
        );
  const required = callValueWei + gasReserve;

  if (balance < required) {
    const have = formatEther(balance);
    const need = formatEther(required);
    throw new Error(
      `Smart wallet needs ${NATIVE_SYMBOL} for this trade. Have ${have} ${NATIVE_SYMBOL}, need about ${need} ${NATIVE_SYMBOL} (trade + gas) at ${scwAddress}. Deposit via Wallet → Deposit.`
    );
  }
}
