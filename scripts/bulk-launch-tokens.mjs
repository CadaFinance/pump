/**
 * Bulk launch random memecoins via MemeFactory.createMeme.
 *
 *   node --env-file=.env scripts/bulk-launch-tokens.mjs
 *   node --env-file=.env scripts/bulk-launch-tokens.mjs --count 10 --from 0
 *
 * Env: DEPLOYER_PRIVATE_KEY, NEXT_PUBLIC_MEME_FACTORY, NEXT_PUBLIC_BONDING_CURVE_MANAGER,
 *      NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_CHAIN_ID, LAUNCHPAD_DATABASE_URL (optional metadata)
 */
import { createAvatar } from "@dicebear/core";
import {
  adventurer,
  avataaars,
  bigSmile,
  bottts,
  croodles,
  funEmoji,
  lorelei,
  micah,
  notionists,
  personas,
  pixelArt,
  toonHead,
} from "@dicebear/collection";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEventLogs,
  parseGwei,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROGRESS_PATH = path.join(__dirname, ".bulk-launch-progress.json");

const USER_AVATAR_IDS = [
  "avataaars",
  "bottts",
  "pixelArt",
  "funEmoji",
  "lorelei",
  "adventurer",
  "bigSmile",
  "croodles",
  "micah",
  "personas",
  "notionists",
  "toonHead",
];

const USER_AVATAR_BG_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1f4d1",
  "f9e8a8",
  "ffdfbf",
  "a8e6cf",
  "87ceeb",
  "f4a460",
  "dda0dd",
  "98d8c8",
];

const DICEBEAR_STYLE_MAP = {
  avataaars,
  bottts,
  pixelArt,
  funEmoji,
  lorelei,
  adventurer,
  bigSmile,
  croodles,
  micah,
  personas,
  notionists,
  toonHead,
};

/** DiceBear HTTP API style slugs (PNG render of same collection). */
const DICEBEAR_API_SLUG = {
  avataaars: "avataaars",
  bottts: "bottts",
  pixelArt: "pixel-art",
  funEmoji: "fun-emoji",
  lorelei: "lorelei",
  adventurer: "adventurer",
  bigSmile: "big-smile",
  croodles: "croodles",
  micah: "micah",
  personas: "personas",
  notionists: "notionists",
  toonHead: "toon-head",
};

const SLIPPAGE_BPS = 500n;
const BPS = 10_000n;

const memeFactoryAbi = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeExempt",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minInitialBuyWei",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultVirtualZugReserve",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "defaultVirtualTokenReserve",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createMeme",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "metadataURI", type: "string" },
      { name: "minInitialBuyTokens", type: "uint256" },
    ],
    outputs: [{ name: "token", type: "address" }],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "targetZug", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
];

const bondingCurveManagerAbi = [
  {
    type: "function",
    name: "protocolFeeBps",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

const ADJECTIVES = [
  "Moon",
  "Doge",
  "Pepe",
  "Chad",
  "Based",
  "Turbo",
  "Mega",
  "Giga",
  "Alpha",
  "Sigma",
  "Cosmic",
  "Lucky",
  "Golden",
  "Diamond",
  "Rocket",
  "Cyber",
  "Pixel",
  "Froggy",
  "Bull",
  "Bear",
];

const NOUNS = [
  "Coin",
  "Inu",
  "Frog",
  "Ape",
  "Cat",
  "Duck",
  "Shiba",
  "Bonk",
  "Wif",
  "Pump",
  "Gem",
  "Meme",
  "Token",
  "Boi",
  "Lord",
  "King",
  "Queen",
  "DAO",
  "Fi",
  "Swap",
];

const DESCRIPTION_TEMPLATES = [
  "Community-driven meme coin on the bonding curve. WAGMI.",
  "Fair launch. No presale. Just vibes and chart.",
  "The next cult classic — probably nothing.",
  "Built for degens who love fresh curves.",
  "Meme energy only. NFA DYOR.",
  "100% community. 0% roadmap promises.",
  "Launched with minimum buy — pure organic start.",
  "Ticker goes up, serotonin goes brrr.",
];

function parseArgs(argv) {
  let count = 1000;
  let from = 0;
  let dryRun = false;
  let apiBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--count") {
      count = Number(argv[++i] ?? count);
    } else if (arg === "--from") {
      from = Number(argv[++i] ?? from);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--api-base") {
      apiBase = String(argv[++i] ?? apiBase);
    }
  }

  return { count, from, dryRun, apiBase };
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function normalizePrivateKey(raw) {
  const trimmed = raw.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function quoteFreshBuy({ zugIn, virtualZugReserve, virtualTokenReserve, protocolFeeBps }) {
  if (zugIn <= 0n) return 0n;
  const feeZug = (zugIn * protocolFeeBps) / BPS;
  const netZug = zugIn - feeZug;
  const x0 = virtualZugReserve;
  const y0 = virtualTokenReserve;
  const k = x0 * y0;
  const y1 = k / (x0 + netZug);
  return y0 - y1;
}

function minOutWithSlippage(amount, slippageBps = SLIPPAGE_BPS) {
  if (amount <= 0n) return 0n;
  return (amount * (BPS - slippageBps)) / BPS;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function randomName() {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  const suffix = randomInt(9999);
  return `${adj} ${noun} ${suffix}`.slice(0, 64);
}

function randomSymbol(name) {
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const base = letters.slice(0, 4) || "MEME";
  const extra = String(randomInt(999)).padStart(3, "0");
  return `${base}${extra}`.slice(0, 16);
}

function randomDescription() {
  const base = pick(DESCRIPTION_TEMPLATES);
  const tag = pick(["🚀", "🐸", "💎", "🔥", "🌙", ""]);
  return `${base} ${tag}`.trim().slice(0, 500);
}

function avatarStyleForSeed(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return USER_AVATAR_IDS[hash % USER_AVATAR_IDS.length];
}

function avatarOptions(seed) {
  return {
    seed,
    size: 256,
    backgroundColor: USER_AVATAR_BG_COLORS,
    backgroundType: ["solid"],
  };
}

/** Build PNG via DiceBear API (same styles/seeds as createAvatar in the app). */
async function renderAvatarPng(seed, styleId) {
  const style = DICEBEAR_STYLE_MAP[styleId];
  if (!style) throw new Error(`Unknown avatar style: ${styleId}`);

  createAvatar(style, avatarOptions(seed)).toString();

  const slug = DICEBEAR_API_SLUG[styleId];
  const bg = USER_AVATAR_BG_COLORS[seed.length % USER_AVATAR_BG_COLORS.length];
  const url =
    `https://api.dicebear.com/9.x/${slug}/png` +
    `?seed=${encodeURIComponent(seed)}` +
    `&size=256` +
    `&backgroundColor=${bg}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`DiceBear PNG failed (${res.status}) for ${slug}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function saveLogoPng(tokenAddress, pngBuffer) {
  const normalized = tokenAddress.toLowerCase();
  const assetsRoot = process.env.ASSETS_DIR?.trim() || path.join(ROOT, "public");
  const dir = path.join(assetsRoot, "icons", "tokens");
  await mkdir(dir, { recursive: true });
  const filename = `${normalized}.png`;
  await writeFile(path.join(dir, filename), pngBuffer);
  return `/icons/tokens/${filename}`;
}

async function upsertOffChainProfile(pool, chainId, input) {
  const normalized = input.address.toLowerCase();
  await pool.query(
    `
    INSERT INTO tokens (
      address,
      chain_id,
      creator_address,
      name,
      symbol,
      launch_tx_hash,
      launch_block_number,
      description,
      social_links,
      logo_url,
      status,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '{}'::jsonb, $9, 'BONDING', now(), now())
    ON CONFLICT (address) DO UPDATE SET
      description = COALESCE(EXCLUDED.description, tokens.description),
      logo_url = COALESCE(EXCLUDED.logo_url, tokens.logo_url),
      name = EXCLUDED.name,
      symbol = EXCLUDED.symbol,
      launch_tx_hash = EXCLUDED.launch_tx_hash,
      launch_block_number = EXCLUDED.launch_block_number,
      updated_at = now()
    `,
    [
      normalized,
      chainId,
      input.creatorAddress.toLowerCase(),
      input.name,
      input.symbol,
      input.txHash.toLowerCase(),
      input.blockNumber,
      input.description,
      input.logoUrl,
    ]
  );

  if (input.logoUrl) {
    await pool.query(
      `
      INSERT INTO token_media (token_address, media_type, url)
      VALUES ($1, 'LOGO', $2)
      ON CONFLICT (token_address, media_type) DO UPDATE SET url = EXCLUDED.url
      `,
      [normalized, input.logoUrl.split("?")[0]]
    );
  }
}

async function postMetadataApi(apiBase, tokenAddress, txHash, description) {
  if (!apiBase) return;
  const base = apiBase.replace(/\/$/, "");
  const res = await fetch(`${base}/api/tokens/${tokenAddress}/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, description }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[metadata API] ${tokenAddress}: ${res.status} ${body}`);
  }
}

async function uploadLogoApi(apiBase, tokenAddress, txHash, pngBuffer) {
  if (!apiBase) return;
  const base = apiBase.replace(/\/$/, "");
  const form = new FormData();
  form.append("tokenAddress", tokenAddress.toLowerCase());
  form.append("txHash", txHash);
  form.append("file", new Blob([pngBuffer], { type: "image/png" }), "logo.png");

  const res = await fetch(`${base}/api/upload/token-logo`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[logo API] ${tokenAddress}: ${res.status} ${body}`);
  }
}

async function loadProgress() {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { launched: [], failed: [] };
  }
}

async function saveProgress(progress) {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

async function main() {
  const { count, from, dryRun, apiBase } = parseArgs(process.argv);
  const privateKey = normalizePrivateKey(requireEnv("DEPLOYER_PRIVATE_KEY"));
  const memeFactory = requireEnv("NEXT_PUBLIC_MEME_FACTORY");
  const bondingCurveManager = requireEnv("NEXT_PUBLIC_BONDING_CURVE_MANAGER");
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://bsc-testnet-rpc.publicnode.com";
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 97);

  const pumpChain = defineChain({
    id: chainId,
    name: "Pump chain",
    nativeCurrency: { decimals: 18, name: "BNB", symbol: "BNB" },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain: pumpChain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account,
    chain: pumpChain,
    transport: http(rpcUrl),
  });

  const [
    factoryOwner,
    createFee,
    feeExempt,
    minInitialBuyWei,
    virtualZugReserve,
    virtualTokenReserve,
    protocolFeeBps,
    balance,
  ] = await Promise.all([
    publicClient.readContract({ address: memeFactory, abi: memeFactoryAbi, functionName: "owner" }),
    publicClient.readContract({ address: memeFactory, abi: memeFactoryAbi, functionName: "createFee" }),
    publicClient.readContract({
      address: memeFactory,
      abi: memeFactoryAbi,
      functionName: "feeExempt",
      args: [account.address],
    }),
    publicClient.readContract({
      address: memeFactory,
      abi: memeFactoryAbi,
      functionName: "minInitialBuyWei",
    }),
    publicClient.readContract({
      address: memeFactory,
      abi: memeFactoryAbi,
      functionName: "defaultVirtualZugReserve",
    }),
    publicClient.readContract({
      address: memeFactory,
      abi: memeFactoryAbi,
      functionName: "defaultVirtualTokenReserve",
    }),
    publicClient.readContract({
      address: bondingCurveManager,
      abi: bondingCurveManagerAbi,
      functionName: "protocolFeeBps",
    }),
    publicClient.getBalance({ address: account.address }),
  ]);

  const isOwner = factoryOwner.toLowerCase() === account.address.toLowerCase();
  const feeWei = isOwner || feeExempt ? 0n : createFee;
  const initialBuyWei = minInitialBuyWei;
  const estimatedTokens = quoteFreshBuy({
    zugIn: initialBuyWei,
    virtualZugReserve,
    virtualTokenReserve,
    protocolFeeBps,
  });
  const minInitialBuyTokens = minOutWithSlippage(estimatedTokens, SLIPPAGE_BPS);
  const valuePerLaunch = feeWei + initialBuyWei;

  if (minInitialBuyTokens === 0n) {
    throw new Error("minInitialBuyTokens is 0 — increase minInitialBuyWei or check curve params");
  }

  const totalCostEstimate = valuePerLaunch * BigInt(count);
  const gasBuffer = parseGwei("500000") * 350_000n * BigInt(count);

  console.log("=== Bulk token launch ===");
  console.log(`Deployer:     ${account.address}`);
  console.log(`Factory:      ${memeFactory}`);
  console.log(`Fee exempt:   ${isOwner || feeExempt} (fee ${formatEther(feeWei)} BNB)`);
  console.log(`Min buy:      ${formatEther(initialBuyWei)} BNB`);
  console.log(`Min tokens:   ${minInitialBuyTokens.toString()}`);
  console.log(`Per launch:   ${formatEther(valuePerLaunch)} BNB (+ gas)`);
  console.log(`Count:        ${count} (from index ${from})`);
  console.log(`BNB balance:  ${formatEther(balance)}`);
  console.log(`Est. value:   ~${formatEther(totalCostEstimate)} BNB + gas`);
  console.log(`Dry run:      ${dryRun}`);

  if (balance < totalCostEstimate) {
    console.warn("WARNING: balance may be insufficient for all launches (gas not included).");
  }

  const dbUrl = process.env.LAUNCHPAD_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  const pool = dbUrl ? new pg.Pool({ connectionString: dbUrl }) : null;

  const progress = await loadProgress();
  const end = from + count;

  for (let i = from; i < end; i += 1) {
    const seed = `bulk-${i}-${Date.now()}-${randomInt(1_000_000)}`;
    const name = randomName();
    const symbol = randomSymbol(name);
    const description = randomDescription();
    const styleId = avatarStyleForSeed(seed);

    console.log(`\n[${i + 1 - from}/${count}] #${i} ${symbol} — ${name}`);

    if (dryRun) {
      console.log(`  dry-run: would launch with ${formatEther(valuePerLaunch)} BNB`);
      continue;
    }

    try {
      const hash = await walletClient.writeContract({
        address: memeFactory,
        abi: memeFactoryAbi,
        functionName: "createMeme",
        args: [name, symbol, "", minInitialBuyTokens],
        value: valuePerLaunch,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error(`tx reverted: ${hash}`);
      }

      const events = parseEventLogs({
        abi: memeFactoryAbi,
        logs: receipt.logs,
        eventName: "TokenCreated",
      });
      const created = events[0]?.args;
      const tokenAddress = created?.token;
      if (!tokenAddress) {
        throw new Error(`TokenCreated not found in ${hash}`);
      }

      const pngBuffer = await renderAvatarPng(seed, styleId);
      const logoUrl = await saveLogoPng(tokenAddress, pngBuffer);

      if (pool) {
        await upsertOffChainProfile(pool, chainId, {
          address: tokenAddress,
          creatorAddress: account.address,
          name: created.name,
          symbol: created.symbol,
          txHash: hash,
          blockNumber: receipt.blockNumber.toString(),
          description,
          logoUrl,
        });
      }

      await postMetadataApi(apiBase, tokenAddress, hash, description);
      await uploadLogoApi(apiBase, tokenAddress, hash, pngBuffer);

      progress.launched.push({
        index: i,
        token: tokenAddress,
        symbol,
        name,
        txHash: hash,
        at: new Date().toISOString(),
      });
      await saveProgress(progress);

      console.log(`  OK ${tokenAddress} tx=${hash.slice(0, 12)}…`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  FAIL: ${message}`);
      progress.failed.push({ index: i, symbol, name, error: message, at: new Date().toISOString() });
      await saveProgress(progress);
    }
  }

  if (pool) {
    await pool.end();
  }

  console.log("\n=== Done ===");
  console.log(`Launched: ${progress.launched.length}`);
  console.log(`Failed:   ${progress.failed.length}`);
  console.log(`Progress: ${PROGRESS_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
