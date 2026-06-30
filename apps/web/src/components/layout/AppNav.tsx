"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppMoreSheet } from "@/components/layout/AppMoreSheet";
import {
  APP_BOTTOM_TAB_AFTER_CREATE,
  APP_BOTTOM_TAB_BEFORE_CREATE,
  isMoreRoute,
  isNavActive,
} from "@/lib/nav-config";
import { PumpIcon, faEllipsis, faPlus } from "@/lib/icons";

export function AppNavView({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const moreActive = moreOpen || isMoreRoute(pathname);

  return (
    <>
      <nav className="bottom-nav md:hidden" aria-label="Primary">
        {APP_BOTTOM_TAB_BEFORE_CREATE.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
            >
              <PumpIcon icon={item.icon} className="bottom-nav-icon" />
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/create"
          prefetch={true}
          aria-current={pathname.startsWith("/create") ? "page" : undefined}
          className={`bottom-nav-fab ${pathname.startsWith("/create") ? "bottom-nav-fab-active" : ""}`}
          aria-label="Create token"
        >
          <span className="bottom-nav-fab-icon" aria-hidden>
            <PumpIcon icon={faPlus} className="h-6 w-6" />
          </span>
          <span className="bottom-nav-label">Create</span>
        </Link>

        {APP_BOTTOM_TAB_AFTER_CREATE.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
            >
              <PumpIcon icon={item.icon} className="bottom-nav-icon" />
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={`bottom-nav-item ${moreActive ? "bottom-nav-item-active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="app-more-sheet"
          aria-label="More options"
          onClick={() => setMoreOpen(true)}
        >
          <PumpIcon icon={faEllipsis} className="bottom-nav-icon" />
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>

      <AppMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} />
    </>
  );
}

export function AppNav() {
  const pathname = usePathname();
  return <AppNavView pathname={pathname} />;
}
