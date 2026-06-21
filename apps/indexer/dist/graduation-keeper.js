import { createPublicClient, createWalletClient, http, } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import { keeperConfig } from "./keeper-config.js";
import { bondingCurveManagerAbi } from "./abi.js";
import { closePools, createPools, loadContractRegistry } from "./db.js";
import { normalizeAddress } from "./utils.js";
const zugchain = defineChain({
    id: keeperConfig.chainId,
    name: "Zugchain",
    nativeCurrency: { name: "ZUG", symbol: "ZUG", decimals: 18 },
    rpcUrls: { default: { http: [keeperConfig.rpcUrl] } },
});
const pools = createPools(keeperConfig.launchpadDatabaseUrl);
const account = privateKeyToAccount(keeperConfig.keeperPrivateKey);
const publicClient = createPublicClient({
    chain: zugchain,
    transport: http(keeperConfig.rpcUrl),
});
const walletClient = createWalletClient({
    account,
    chain: zugchain,
    transport: http(keeperConfig.rpcUrl),
});
let shuttingDown = false;
process.on("SIGINT", () => {
    shuttingDown = true;
});
process.on("SIGTERM", () => {
    shuttingDown = true;
});
async function listDbCandidates() {
    const result = await pools.launchpad.query(`
      SELECT t.address
      FROM tokens t
      JOIN bonding_states b ON b.token_address = t.address
      WHERE t.is_hidden = false
        AND t.status IN ('BONDING', 'GRADUATING')
        AND b.target_zug > 0
        AND b.reserve_zug >= b.target_zug
      ORDER BY t.updated_at DESC
    `);
    return result.rows.map((row) => normalizeAddress(row.address));
}
async function readCurve(bondingCurveManager, token) {
    const curve = (await publicClient.readContract({
        address: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "curves",
        args: [token],
    }));
    return {
        reserveZug: curve[2],
        targetZug: curve[4],
        graduationTriggered: curve[7],
        graduated: curve[8],
    };
}
async function graduateToken(bondingCurveManager, token) {
    const hash = await walletClient.writeContract({
        address: bondingCurveManager,
        abi: bondingCurveManagerAbi,
        functionName: "graduate",
        args: [token],
        chain: zugchain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
        throw new Error(`graduate tx reverted: ${hash}`);
    }
    return hash;
}
async function tick(bondingCurveManager) {
    const candidates = await listDbCandidates();
    if (candidates.length === 0) {
        console.log("graduation keeper: no candidates");
        return;
    }
    for (const token of candidates) {
        try {
            const curve = await readCurve(bondingCurveManager, token);
            if (curve.graduated) {
                console.log(`skip ${token}: already graduated on-chain`);
                continue;
            }
            if (curve.reserveZug < curve.targetZug) {
                console.log(`skip ${token}: reserve below target on-chain`);
                continue;
            }
            console.log(`graduating ${token} reserve=${curve.reserveZug.toString()} target=${curve.targetZug.toString()} triggered=${curve.graduationTriggered}`);
            const hash = await graduateToken(bondingCurveManager, token);
            console.log(`graduated ${token} tx=${hash}`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`failed ${token}: ${message}`);
        }
    }
}
async function main() {
    const registry = await loadContractRegistry(pools.launchpad);
    console.log(`graduation keeper ready: chain=${keeperConfig.chainId}, keeper=${account.address}, bondingCurve=${registry.bondingCurveManager}`);
    do {
        await tick(registry.bondingCurveManager);
        if (keeperConfig.once)
            break;
        await sleep(keeperConfig.pollIntervalMs);
    } while (!shuttingDown);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await closePools(pools);
});
