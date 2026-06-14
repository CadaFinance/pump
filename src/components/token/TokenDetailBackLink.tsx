"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/safe-return-path";

export function TokenDetailBackLink() {
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"));

  if (returnTo) {
    const label = returnTo.startsWith("/airdrops/") ? "← Airdrop" : "← Back";
    return (
      <Link
        href={returnTo}
        className="inline-flex items-center text-body-sm text-pump-muted transition hover:text-pump-accent"
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className="inline-flex items-center text-body-sm text-pump-muted transition hover:text-pump-accent"
    >
      ← Arena
    </Link>
  );
}
