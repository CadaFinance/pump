"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { isAdminWallet } from "@/config/admin";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();

  if (isConnecting) {
    return <p className="text-body-sm text-pump-muted">Loading…</p>;
  }

  if (!isConnected || !isAdminWallet(address)) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl font-semibold text-pump-muted">404</p>
        <p className="mt-2 text-body-sm text-pump-muted">This page could not be found.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-pump-accent hover:underline">
          Back to Arena
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
