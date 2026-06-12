/**
 * UI display status derived from DB/on-chain fields + wall-clock.
 * DB `status` stays coarse (ACTIVE / FINALIZED / CLOSED); this is for labels only.
 */

export type AirdropDisplayStatus =
  | "UPCOMING"
  | "QUALIFYING"
  | "FINALIZING"
  | "CLAIMABLE"
  | "CLOSED";

type StatusInput = {
  /** Raw DB status from indexer */
  status: string;
  qualifyStart: string;
  qualifyEnd: string;
  claimEnd?: string | null;
  merkleRoot?: string | null;
};

const CLAIM_MS = 24 * 60 * 60 * 1000;

export function getAirdropDisplayStatus(input: StatusInput): AirdropDisplayStatus {
  const now = Date.now();
  const qualifyStart = new Date(input.qualifyStart).getTime();
  const qualifyEnd = new Date(input.qualifyEnd).getTime();
  const claimEnd = input.claimEnd
    ? new Date(input.claimEnd).getTime()
    : qualifyEnd + CLAIM_MS;

  if (input.status === "CLOSED" || now > claimEnd) {
    return "CLOSED";
  }

  const finalized =
    input.status === "FINALIZED" || Boolean(input.merkleRoot && input.merkleRoot !== "0x");

  if (finalized) {
    return now >= qualifyEnd && now <= claimEnd ? "CLAIMABLE" : "CLOSED";
  }

  if (now < qualifyStart) {
    return "UPCOMING";
  }

  if (now >= qualifyStart && now <= qualifyEnd) {
    return "QUALIFYING";
  }

  return "FINALIZING";
}

export function formatAirdropDisplayStatus(status: AirdropDisplayStatus): string {
  switch (status) {
    case "UPCOMING":
      return "Upcoming";
    case "QUALIFYING":
      return "Qualifying";
    case "FINALIZING":
      return "Finalizing";
    case "CLAIMABLE":
      return "Claimable";
    case "CLOSED":
      return "Closed";
  }
}

const statusBadgeBase =
  "inline-flex shrink-0 items-center rounded-sm px-2.5 py-1 text-label font-semibold uppercase";

export function airdropStatusBadgeClass(status: AirdropDisplayStatus): string {
  switch (status) {
    case "UPCOMING":
      return `${statusBadgeBase} border border-pump-border/25 bg-pump-surface/65 text-pump-muted`;
    case "QUALIFYING":
      return `${statusBadgeBase} border border-pump-accent/35 bg-pump-accent/15 text-pump-accent`;
    case "FINALIZING":
      return `${statusBadgeBase} border border-pump-warning/35 bg-pump-warning/15 text-pump-warning`;
    case "CLAIMABLE":
      return `${statusBadgeBase} border border-pump-success/35 bg-pump-success/15 text-pump-success`;
    case "CLOSED":
      return `${statusBadgeBase} border border-pump-border/20 bg-pump-surface/50 text-pump-muted opacity-80`;
  }
}
