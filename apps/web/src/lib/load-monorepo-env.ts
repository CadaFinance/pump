import fs from "node:fs";
import path from "node:path";

/** Load monorepo root `.env` into process.env (Next default cwd is apps/web). */
export function loadMonorepoRootEnv(monorepoRoot: string): void {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(monorepoRoot, name);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;

      const key = trimmed.slice(0, eq).trim();
      if (!key || key in process.env) continue;

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
}
