"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shellMaxWidthClass } from "@/components/layout/layout-shell";

const links = [
  { href: "/", label: "Arena" },
  { href: "/airdrops", label: "Airdrops" },
  { href: "/missions", label: "Missions" },
  { href: "/portfolio", label: "Portfolio" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop — inline in header area via duplicate hidden; primary desktop nav is in AppHeader */}
      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-pump-border/20 bg-pump-bg/94 backdrop-blur-xl md:hidden">
        <div className={`mx-auto flex px-2 py-2 ${shellMaxWidthClass}`}>
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                className={`flex-1 rounded-md py-3 text-center text-sm font-medium transition ${
                  active
                    ? "bg-pump-accent/14 text-pump-accent"
                    : "text-pump-muted hover:bg-pump-surface/60 hover:text-pump-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export { links as appNavLinks };
