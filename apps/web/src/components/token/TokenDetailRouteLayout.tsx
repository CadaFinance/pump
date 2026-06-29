"use client";

import { useParams } from "next/navigation";
import { TokenDetailShell } from "@/components/token/TokenDetailShell";

type TokenDetailRouteLayoutProps = {
  children: React.ReactNode;
};

/**
 * Client-only token route shell — never suspends on /token/[address] switches.
 * Async server layout would unmount sidebar + replay board animations each click.
 */
export function TokenDetailRouteLayout({ children }: TokenDetailRouteLayoutProps) {
  const params = useParams<{ address: string }>();
  const address = params?.address;

  if (!address) return null;

  return (
    <>
      <TokenDetailShell address={address} />
      {children}
    </>
  );
}
