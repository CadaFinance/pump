import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Abi } from "viem";

type FoundryArtifact = {
  abi: Abi;
};

const defaultArtifactRoot = path.resolve(process.cwd(), "..", "contracts", "out");

function resolveArtifactRoot(): string {
  const configured = process.env.CONTRACT_ARTIFACTS_DIR?.trim();
  if (!configured) return defaultArtifactRoot;

  // .env copied from Windows → ignore invalid path on Linux VM.
  const looksLikeWindowsPath =
    /^[a-zA-Z]:[/\\]/.test(configured) || configured.includes("\\");
  if (looksLikeWindowsPath && process.platform !== "win32") {
    console.warn(
      `[indexer] CONTRACT_ARTIFACTS_DIR is a Windows path (${configured}); using ${defaultArtifactRoot}`
    );
    return defaultArtifactRoot;
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

const artifactRoot = resolveArtifactRoot();

function readArtifactAbi(relativePath: string): Abi {
  const artifactPath = path.join(artifactRoot, relativePath);
  if (!existsSync(artifactPath)) {
    throw new Error(
      `Contract artifact not found: ${artifactPath}\n` +
        `Set CONTRACT_ARTIFACTS_DIR in .env (VM example: /var/www/pump/contracts/out) ` +
        `and ensure forge build output is deployed beside the Indexer.`
    );
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as FoundryArtifact;
  return artifact.abi;
}

export const memeFactoryAbi = readArtifactAbi("MemeFactory.sol/MemeFactory.json");
export const bondingCurveManagerAbi = readArtifactAbi("BondingCurveManager.sol/BondingCurveManager.json");
export const graduationManagerAbi = readArtifactAbi("GraduationManager.sol/GraduationManager.json");
export const pumpAirdropManagerAbi = readArtifactAbi("PumpAirdropManager.sol/PumpAirdropManager.json");
