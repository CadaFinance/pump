import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function applyEnvFile(path: string): void {
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

/** Load LAUNCHPAD_DATABASE_URL for one-off indexer scripts (VM + monorepo cwd). */
export function loadIndexerEnv(): void {
  if (process.env.LAUNCHPAD_DATABASE_URL?.trim()) return;

  const candidates = [
    process.env.PUMP_INDEXER_ENV,
    "/var/www/pump/Indexer/.env",
    join(moduleDir, "../.env"),
    resolve(process.cwd(), "apps/indexer/.env"),
    resolve(process.cwd(), ".env"),
  ].filter((path): path is string => Boolean(path));

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    applyEnvFile(path);
    if (process.env.LAUNCHPAD_DATABASE_URL?.trim()) return;
  }
}
