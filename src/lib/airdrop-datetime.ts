/**
 * Airdrop qualify window — timezone rules:
 *
 * - UI (`datetime-local`): creator's **browser local time**
 * - On-chain: Unix seconds (UTC epoch) — `block.timestamp` / uint64
 * - PostgreSQL: `timestamptz` (UTC internally; indexer/API use ISO UTC)
 *
 * Never send local-time strings to the contract or DB without converting to Unix/ISO first.
 */

/** Min seconds before qualify start (tx mining + clock skew). */
export const QUALIFY_START_MIN_LEAD_SEC = 120;

/** Min seconds before qualify end at submit (must pass `qualifyEnd > block.timestamp`). */
export const QUALIFY_END_MIN_LEAD_SEC = 180;

/** Min gap between start and end (15 minutes — testnet-friendly). */
export const QUALIFY_MIN_DURATION_SEC = 15 * 60;

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse `datetime-local` as local wall time → Unix seconds (UTC epoch). */
export function localDatetimeToUnix(value: string): number {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return Number.NaN;
  return Math.floor(ms / 1000);
}

export function unixToDatetimeLocal(unixSec: number): string {
  return toDatetimeLocalValue(new Date(unixSec * 1000));
}

/** Earliest selectable local datetime (now + lead minutes). */
export function minDatetimeLocal(leadMinutes: number): string {
  const d = new Date(Date.now() + leadMinutes * 60 * 1000);
  d.setSeconds(0, 0);
  return toDatetimeLocalValue(d);
}

export function defaultQualifyStartLocal(): string {
  return minDatetimeLocal(Math.ceil(QUALIFY_START_MIN_LEAD_SEC / 60) + 5);
}

export function defaultQualifyEndLocal(startLocal?: string): string {
  const startUnix = startLocal ? localDatetimeToUnix(startLocal) : localDatetimeToUnix(defaultQualifyStartLocal());
  const endUnix = Number.isFinite(startUnix)
    ? startUnix + 24 * 3600
    : Math.floor(Date.now() / 1000) + 25 * 3600;
  return unixToDatetimeLocal(endUnix);
}

export function userTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "local time";
  }
}

/** UTC preview for creator transparency (on-chain / DB storage). */
export function formatUtcPreview(localValue: string): string | null {
  const unix = localDatetimeToUnix(localValue);
  if (!Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export type QualifyWindowValidation =
  | { ok: true; startSec: number; endSec: number }
  | { ok: false; error: string };

export function validateQualifyWindow(
  startLocal: string,
  endLocal: string,
  nowSec = Math.floor(Date.now() / 1000)
): QualifyWindowValidation {
  const startSec = localDatetimeToUnix(startLocal);
  const endSec = localDatetimeToUnix(endLocal);

  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    return { ok: false, error: "Invalid date or time" };
  }

  if (startSec < nowSec + QUALIFY_START_MIN_LEAD_SEC) {
    return {
      ok: false,
      error: `Start must be at least ${Math.ceil(QUALIFY_START_MIN_LEAD_SEC / 60)} minutes from now (your local time)`,
    };
  }

  if (endSec < nowSec + QUALIFY_END_MIN_LEAD_SEC) {
    return {
      ok: false,
      error: "End must be far enough in the future for the blockchain transaction to confirm",
    };
  }

  if (endSec <= startSec) {
    return { ok: false, error: "End must be after start" };
  }

  if (endSec - startSec < QUALIFY_MIN_DURATION_SEC) {
    const minMinutes = Math.ceil(QUALIFY_MIN_DURATION_SEC / 60);
    return {
      ok: false,
      error: `Qualification window must be at least ${minMinutes} minutes`,
    };
  }

  return { ok: true, startSec, endSec };
}

/** Clamp end forward if start moved past it. */
export function endAfterStartOrDefault(startLocal: string, endLocal: string): string {
  const startSec = localDatetimeToUnix(startLocal);
  const endSec = localDatetimeToUnix(endLocal);
  if (!Number.isFinite(startSec)) return endLocal;
  if (!Number.isFinite(endSec) || endSec <= startSec + QUALIFY_MIN_DURATION_SEC) {
    return unixToDatetimeLocal(startSec + 24 * 3600);
  }
  return endLocal;
}
