import { createPublicClient, http, type Address } from "viem";
import { memeFactoryAbi } from "@/lib/abis/meme-factory";
import { pumpAirdropManagerAbi } from "@/lib/abis/pump-airdrop-manager";
import { contracts, pumpChain, rpcUrl } from "@/config/chain";
import { getLaunchpadPool } from "@/lib/db/launchpad";

const publicClient = createPublicClient({
  chain: pumpChain,
  transport: http(rpcUrl, { timeout: 30_000 }),
});

export type FeeExemptListEntry = {
  address: string;
  meme: boolean;
  airdrop: boolean;
};

export type FeeExemptListResult = {
  entries: FeeExemptListEntry[];
  memeOwner: string;
  airdropAdmin: string | null;
  fromBlock: string;
};

async function resolveFromBlock(): Promise<bigint> {
  try {
    const pool = getLaunchpadPool();
    const result = await pool.query<{ min_block: string | null }>(
      `SELECT MIN(deployment_block_number)::text AS min_block
       FROM contract_registry
       WHERE is_active = true
         AND deployment_block_number IS NOT NULL
         AND deployment_block_number > 0`
    );
    const minBlock = result.rows[0]?.min_block;
    if (minBlock) return BigInt(minBlock);
  } catch {
    /* registry optional */
  }
  return 0n;
}

async function collectMemeCandidates(fromBlock: bigint): Promise<Set<string>> {
  const logs = await publicClient.getContractEvents({
    address: contracts.memeFactory,
    abi: memeFactoryAbi,
    eventName: "FeeExemptUpdated",
    fromBlock,
    toBlock: "latest",
  });
  const addresses = new Set<string>();
  for (const log of logs) {
    const account = log.args.account;
    if (account) addresses.add(account.toLowerCase());
  }
  return addresses;
}

async function collectAirdropCandidates(fromBlock: bigint): Promise<Set<string>> {
  if (!contracts.airdropManager) return new Set();
  const logs = await publicClient.getContractEvents({
    address: contracts.airdropManager,
    abi: pumpAirdropManagerAbi,
    eventName: "FeeExemptUpdated",
    fromBlock,
    toBlock: "latest",
  });
  const addresses = new Set<string>();
  for (const log of logs) {
    const account = log.args.account;
    if (account) addresses.add(account.toLowerCase());
  }
  return addresses;
}

async function readMemeExemptFlags(addresses: string[]): Promise<Map<string, boolean>> {
  const exempt = new Map<string, boolean>();
  if (addresses.length === 0) return exempt;
  const results = await publicClient.multicall({
    contracts: addresses.map((address) => ({
      address: contracts.memeFactory,
      abi: memeFactoryAbi,
      functionName: "feeExempt" as const,
      args: [address as Address],
    })),
    allowFailure: true,
  });
  for (let i = 0; i < addresses.length; i++) {
    const row = results[i];
    if (row?.status === "success" && row.result === true) {
      exempt.set(addresses[i]!, true);
    }
  }
  return exempt;
}

async function readAirdropExemptFlags(addresses: string[]): Promise<Map<string, boolean>> {
  const exempt = new Map<string, boolean>();
  if (!contracts.airdropManager || addresses.length === 0) return exempt;
  const results = await publicClient.multicall({
    contracts: addresses.map((address) => ({
      address: contracts.airdropManager!,
      abi: pumpAirdropManagerAbi,
      functionName: "feeExempt" as const,
      args: [address as Address],
    })),
    allowFailure: true,
  });
  for (let i = 0; i < addresses.length; i++) {
    const row = results[i];
    if (row?.status === "success" && row.result === true) {
      exempt.set(addresses[i]!, true);
    }
  }
  return exempt;
}

export async function listFeeExemptAddresses(): Promise<FeeExemptListResult> {
  const fromBlock = await resolveFromBlock();
  const factory = contracts.memeFactory;
  const manager = contracts.airdropManager;

  const [memeOwner, airdropAdmin] = await Promise.all([
    publicClient.readContract({
      address: factory,
      abi: memeFactoryAbi,
      functionName: "owner",
    }),
    manager
      ? publicClient.readContract({
          address: manager,
          abi: pumpAirdropManagerAbi,
          functionName: "admin",
        })
      : Promise.resolve(null),
  ]);

  const memeOwnerLc = memeOwner.toLowerCase();
  const airdropAdminLc = airdropAdmin?.toLowerCase() ?? null;

  const [memeCandidates, airdropCandidates] = await Promise.all([
    collectMemeCandidates(fromBlock),
    collectAirdropCandidates(fromBlock),
  ]);

  const allAddresses = [...new Set([...memeCandidates, ...airdropCandidates])];

  const [memeExempt, airdropExempt] = await Promise.all([
    readMemeExemptFlags(allAddresses),
    readAirdropExemptFlags(allAddresses),
  ]);

  const entries: FeeExemptListEntry[] = [];
  for (const address of allAddresses) {
    const meme = memeExempt.get(address) === true;
    const airdrop = airdropExempt.get(address) === true;
    if (!meme && !airdrop) continue;

    // Owner/admin are always free on-chain; hide from revoke list.
    if (address === memeOwnerLc || (airdropAdminLc && address === airdropAdminLc)) continue;

    entries.push({ address, meme, airdrop });
  }

  entries.sort((a, b) => a.address.localeCompare(b.address));

  return {
    entries,
    memeOwner: memeOwnerLc,
    airdropAdmin: airdropAdminLc,
    fromBlock: fromBlock.toString(),
  };
}
