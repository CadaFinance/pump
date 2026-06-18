import { getAddress, isAddress } from "viem";

function toAddressCandidate(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return trimmed;
  if (/^[0-9a-fA-F]{40}$/.test(trimmed)) return `0x${trimmed}`;
  return trimmed;
}

/** Lowercase checksummed address for DB queries, or null if invalid. */
export function normalizeAddressParam(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const candidate = toAddressCandidate(value);
  try {
    if (!isAddress(candidate)) return null;
    return getAddress(candidate).toLowerCase();
  } catch {
    return null;
  }
}
