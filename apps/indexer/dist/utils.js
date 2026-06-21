import { formatUnits, getAddress, isAddress } from "viem";
export function normalizeAddress(address) {
    if (!isAddress(address)) {
        throw new Error(`Invalid address: ${address}`);
    }
    return getAddress(address);
}
export function dbAddress(address) {
    return normalizeAddress(address).toLowerCase();
}
export function eventId(txHash, logIndex) {
    return `${txHash.toLowerCase()}:${logIndex}`;
}
export function weiToDecimal(value) {
    return formatUnits(value, 18);
}
export function ratioWeiToDecimal(numeratorWei, denominatorWei) {
    if (denominatorWei === 0n)
        return "0";
    const scale = 10n ** 18n;
    const scaled = (numeratorWei * scale) / denominatorWei;
    const whole = scaled / scale;
    const fraction = (scaled % scale).toString().padStart(18, "0");
    return `${whole}.${fraction}`;
}
export function blockDate(timestamp) {
    return timestamp.toISOString().slice(0, 10);
}
export function asLogIndex(logIndex) {
    if (logIndex === undefined) {
        throw new Error("Log index is missing");
    }
    return logIndex;
}
