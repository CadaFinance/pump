"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_ITEMS } from "@/lib/nav-config";
import { ICON_STROKE } from "@/lib/icons";
import { shellInnerClass } from "@/components/layout/layout-shell";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav md:hidden" aria-label="Primary">
      <div className={`bottom-nav-inner ${shellInnerClass}`}>
        {APP_NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={`bottom-nav-item ${active ? "bottom-nav-item-active" : ""}`}
            >
              {active ? <span className="bottom-nav-indicator" aria-hidden /> : null}
              <Icon
                className="bottom-nav-icon"
                strokeWidth={active ? 2.25 : ICON_STROKE}
                aria-hidden
              />
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
