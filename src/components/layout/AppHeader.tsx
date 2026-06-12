"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { WalletBar } from "@/components/wallet/WalletBar";
import { appNavLinks } from "@/components/layout/AppNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { isAdminWallet } from "@/config/admin";
import { shellMaxWidthClass, shellPaddingXClass } from "@/components/layout/layout-shell";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 fill-none stroke-current">
      <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { address } = useAccount();
  const showAdminLink = isAdminWallet(address);

  return (
    <header className="sticky top-0 z-50 border-b border-pump-border/15 bg-pump-bg/92 backdrop-blur-xl">
      <div className={`mx-auto flex h-16 items-center justify-between gap-4 ${shellMaxWidthClass} ${shellPaddingXClass}`}>
        <div className="flex min-w-0 items-center gap-5 md:gap-8">
          <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-pump-border/16 bg-pump-surface/50 text-[12px] font-semibold text-pump-text">
              P
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-h3 font-semibold text-pump-text transition group-hover:text-pump-accent">
                Pump
              </h1>
            </div>
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 md:flex">
            {appNavLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`rounded-full px-3 py-1.5 text-body-sm font-medium transition ${
                    active
                      ? "bg-pump-surface/68 text-pump-text"
                      : "text-pump-muted hover:text-pump-text"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {showAdminLink ? (
              <Link
                href="/admin"
                prefetch={true}
                className={`rounded-full px-3 py-1.5 text-body-sm font-medium transition ${
                  pathname.startsWith("/admin")
                    ? "bg-pump-surface/68 text-pump-text"
                    : "text-pump-muted hover:text-pump-text"
                }`}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            href="/create"
            prefetch={true}
            className={`hidden h-10 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-semibold transition md:inline-flex ${
              pathname.startsWith("/create")
                ? "border-transparent bg-pump-accent text-pump-accent-foreground shadow-sm"
                : "border-pump-border/18 bg-pump-surface/52 text-pump-text hover:border-pump-accent/25"
            }`}
          >
            <PlusIcon />
            Create
          </Link>
          <WalletBar />
        </div>
      </div>
    </header>
  );
}
