import { createPublicClient, formatUnits, http, type Address } from "viem";
import { erc20Abi } from "@/lib/abis/erc20";
import { pumpChain, rpcUrl } from "@/config/chain";

const publicClient = createPublicClient({
  chain: pumpChain,
  transport: http(rpcUrl, { timeout: 15_000 }),
});

/** Live ERC20 balances — reflects sells/transfers immediately, unlike indexer user_positions. */
export async function fetchLiveTokenBalances(
  tokenAddress: string,
  addresses: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const balances = new Map<string, string>();
  if (unique.length === 0) return balances;

  const token = tokenAddress.toLowerCase() as Address;
  const chunkSize = 50;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const contracts = chunk.map((address) => ({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address as Address],
    }));

    let results: { status: "success"; result: bigint }[] | null = null;
    try {
      results = (await publicClient.multicall({
        allowFailure: true,
        contracts,
      })) as { status: "success"; result: bigint }[];
    } catch {
      results = null;
    }

    if (results) {
      chunk.forEach((address, index) => {
        const result = results[index];
        const wei = result?.status === "success" ? result.result : 0n;
        balances.set(address, formatUnits(wei, 18));
      });
      continue;
    }

    await Promise.all(
      chunk.map(async (address) => {
        try {
          const wei = await publicClient.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as Address],
          });
          balances.set(address, formatUnits(wei, 18));
        } catch {
          balances.set(address, "0");
        }
      })
    );
  }

  return balances;
}

export async function fetchLiveTokenBalance(
  tokenAddress: string,
  address: string
): Promise<string> {
  const balances = await fetchLiveTokenBalances(tokenAddress, [address]);
  return balances.get(address.toLowerCase()) ?? "0";
}
