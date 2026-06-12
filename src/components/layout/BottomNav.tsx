"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Arena" },
  { href: "/airdrops", label: "Airdrops" },
  { href: "/create", label: "Create" },
  { href: "/portfolio", label: "Portfolio" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-pump-border/20 bg-pump-bg/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg px-2 py-2">
        {links.map((link) => {
          const active = pathname === link.href;
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
  );
}
