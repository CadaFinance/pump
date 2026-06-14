"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useAccount } from "wagmi";
import { WalletBar } from "@/components/wallet/WalletBar";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { ADMIN_NAV_ITEM, APP_NAV_ITEMS } from "@/lib/nav-config";
import { ICON_STROKE } from "@/lib/icons";
import { isAdminWallet } from "@/config/admin";
import { shellInnerClass } from "@/components/layout/layout-shell";

function navLinkClass(active: boolean): string {
  return `header-nav-link ${active ? "header-nav-link-active" : "header-nav-link-idle"}`;
}

export function AppHeader() {
  const pathname = usePathname();
  const { address } = useAccount();
  const showAdminLink = isAdminWallet(address);

  const navItems = showAdminLink ? [...APP_NAV_ITEMS, ADMIN_NAV_ITEM] : APP_NAV_ITEMS;

  return (
    <header className="app-header">
      <div className={`app-header-inner ${shellInnerClass}`}>
        <div className="app-header-start">
          <Link href="/" className="app-header-brand">
            <span className="app-header-brand-mark" aria-hidden>
              P
            </span>
            <span className="truncate">Pump</span>
          </Link>

          <nav className="app-header-nav hidden md:flex" aria-label="Main">
            {navItems.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={navLinkClass(active)}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={ICON_STROKE} aria-hidden />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="app-header-actions">
          <ThemePicker />
          <Link
            href="/create"
            prefetch={true}
            className={`toolbar-btn toolbar-btn-accent hidden md:inline-flex ${
              pathname.startsWith("/create") ? "opacity-95" : ""
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} aria-hidden />
            Create
          </Link>
          <WalletBar />
        </div>
      </div>
    </header>
  );
}
