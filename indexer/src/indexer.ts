import { createPublicClient, fallback, http, parseEventLogs, type Address, type Log } from "viem";
import { config } from "./config.js";
import {
  closePools,
  createPools,
  getIndexerStartBlock,
  loadContractRegistry,
  updateIndexerState
} from "./db.js";
import {
  bondingCurveManagerAbi,
  graduationManagerAbi,
  memeFactoryAbi,
  pumpAirdropManagerAbi
} from "./abi.js";
import { LaunchpadEventHandlers } from "./handlers.js";
import { PointsBridge } from "./points.js";
import { scheduleMvRefresh } from "./mv-refresh.js";
import { closeRedis } from "./redis-publish.js";

type IndexedContract = {
  address: Address;
  abi: typeof memeFactoryAbi;
};

const pools = createPools(config.launchpadDatabaseUrl, config.vm1MainDatabaseUrl);
const publicClient = createPublicClient({
  transport:
    config.rpcUrls.length > 1
      ? fallback(config.rpcUrls.map((url) => http(url, { timeout: 30_000 })))
      : http(config.rpcUrl, { timeout: 30_000 })
});

const LOG_FETCH_MAX_RETRIES = 6;
const LOG_FETCH_BASE_DELAY_MS = 1_500;

let shuttingDown = false;

process.on("SIGINT", () => {
  shuttingDown = true;
});

process.on("SIGTERM", () => {
  shuttingDown = true;
});

async function main(): Promise<void> {
  const registry = await loadContractRegistry(pools.launchpad);
  const contracts: IndexedContract[] = [
    { address: registry.memeFactory, abi: memeFactoryAbi },
    { address: registry.bondingCurveManager, abi: bondingCurveManagerAbi }
  ];
  if (registry.graduationManager) {
    contracts.push({ address: registry.graduationManager, abi: graduationManagerAbi });
  }
  if (registry.pumpAirdropManager) {
    contracts.push({ address: registry.pumpAirdropManager, abi: pumpAirdropManagerAbi });
  }
  const handlers = new LaunchpadEventHandlers({
    launchpadPool: pools.launchpad,
    pointsBridge: new PointsBridge(pools.vm1),
    publicClient,
    poolManagerAddress: config.poolManagerAddress,
    positionManagerAddress: config.positionManagerAddress
  });

  console.log(
    `launchpad indexer ready: chain=${config.chainId}, rpc=${config.rpcUrls.join(" | ")}, graduation=${registry.graduationManager ?? "disabled"}, airdrop=${registry.pumpAirdropManager ?? "disabled"}, contracts=${contracts
      .map((contract) => contract.address)
      .join(", ")}`
  );

  while (!shuttingDown) {
    const fromBlock = await getIndexerStartBlock(pools.launchpad, config.stateKey, config.startBlock);
    const latestBlock = await publicClient.getBlockNumber();
    const safeBlock = latestBlock > config.confirmations ? latestBlock - config.confirmations : 0n;

    if (fromBlock > safeBlock) {
      if (config.once) break;
      await sleep(config.pollIntervalMs);
      continue;
    }

    const toBlock = minBigInt(safeBlock, fromBlock + config.chunkSize - 1n);
    await processRangeAdaptive(contracts, handlers, fromBlock, toBlock);
    await updateIndexerState(pools.launchpad, config.stateKey, toBlock);
    scheduleMvRefresh(pools.launchpad);

    console.log(`indexed blocks ${fromBlock.toString()}-${toBlock.toString()}`);

    if (config.once) break;
  }
}

async function processRangeAdaptive(
  contracts: IndexedContract[],
  handlers: LaunchpadEventHandlers,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  try {
    await processRange(contracts, handlers, fromBlock, toBlock);
  } catch (error) {
    if (isLogRangeLimitError(error) && toBlock > fromBlock) {
      const mid = fromBlock + (toBlock - fromBlock) / 2n;
      await processRangeAdaptive(contracts, handlers, fromBlock, mid);
      await processRangeAdaptive(contracts, handlers, mid + 1n, toBlock);
      return;
    }
    throw error;
  }
}

async function processRange(
  contracts: IndexedContract[],
  handlers: LaunchpadEventHandlers,
  fromBlock: bigint,
  toBlock: bigint
): Promise<void> {
  const rawLogs: Log[] = [];

  for (const contract of contracts) {
    const logs = await fetchLogsWithRetry({
      address: contract.address,
      fromBlock,
      toBlock
    });
    rawLogs.push(...logs);
    await sleep(250);
  }

  const decodedLogs = contracts.flatMap((contract) =>
    parseEventLogs({
      abi: contract.abi,
      logs: filterLogsByAddress(rawLogs, contract.address),
      strict: false
    })
  );

  decodedLogs.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });

  for (const log of decodedLogs) {
    await handlers.handle({
      eventName: log.eventName,
      args: log.args as Record<string, unknown>,
      address: log.address,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex
    });
  }
}

async function fetchLogsWithRetry(params: {
  address: Address;
  fromBlock: bigint;
  toBlock: bigint;
}): Promise<Log[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < LOG_FETCH_MAX_RETRIES; attempt++) {
    try {
      return await publicClient.getLogs({
        address: params.address,
        fromBlock: params.fromBlock,
        toBlock: params.toBlock
      });
    } catch (error) {
      lastError = error;
      if (!isLogRangeLimitError(error) || attempt === LOG_FETCH_MAX_RETRIES - 1) {
        throw error;
      }
      const delay = LOG_FETCH_BASE_DELAY_MS * 2 ** attempt;
      console.warn(
        `getLogs rate limited for ${params.address} blocks ${params.fromBlock}-${params.toBlock}, retry ${attempt + 1}/${LOG_FETCH_MAX_RETRIES} in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function isLogRangeLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: number; details?: string; shortMessage?: string; cause?: unknown };
  if (e.code === -32005 || e.code === 429) return true;
  if (typeof e.details === "string" && e.details.toLowerCase().includes("limit")) return true;
  if (typeof e.shortMessage === "string" && e.shortMessage.toLowerCase().includes("limit")) return true;
  if (e.cause) return isLogRangeLimitError(e.cause);
  return false;
}

function filterLogsByAddress(logs: Log[], address: Address): Log[] {
  const normalized = address.toLowerCase();
  return logs.filter((log) => log.address.toLowerCase() === normalized);
}

function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeRedis();
    await closePools(pools);
  });
