import { getAddress, isAddress } from "viem";

/** Lowercase checksummed address for DB queries, or null if invalid. */
export function normalizeAddressParam(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  if (!isAddress(value)) return null;
  return getAddress(value).toLowerCase();
}
