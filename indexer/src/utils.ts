import type { Address, Hash } from "viem";
import { formatUnits, getAddress, isAddress } from "viem";

export function normalizeAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }

  return getAddress(address);
}

export function dbAddress(address: string): string {
  return normalizeAddress(address).toLowerCase();
}

export function eventId(txHash: Hash, logIndex: number): string {
  return `${txHash.toLowerCase()}:${logIndex}`;
}

export function weiToDecimal(value: bigint): string {
  return formatUnits(value, 18);
}

export function ratioWeiToDecimal(numeratorWei: bigint, denominatorWei: bigint): string {
  if (denominatorWei === 0n) return "0";

  const scale = 10n ** 18n;
  const scaled = (numeratorWei * scale) / denominatorWei;
  const whole = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(18, "0");

  return `${whole}.${fraction}`;
}

export function blockDate(timestamp: Date): string {
  return timestamp.toISOString().slice(0, 10);
}

export function asLogIndex(logIndex: number | undefined): number {
  if (logIndex === undefined) {
    throw new Error("Log index is missing");
  }

  return logIndex;
}
