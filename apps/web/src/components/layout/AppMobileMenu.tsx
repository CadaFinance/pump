"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PumpLogo } from "@/components/brand/PumpLogo";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { APP_NAV_ITEMS } from "@/lib/nav-config";
import { PumpIcon, faChevronRight, faMenu, faPlus, faX } from "@/lib/icons";

type AppMobileMenuProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
};

function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppMobileMenu({ open, onClose, pathname }: AppMobileMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <ModalPortal open={open}>
      <div
        id="app-mobile-menu"
        className="app-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="app-mobile-menu__backdrop"
          aria-label="Close menu"
          onClick={onClose}
        />
        <aside className="app-mobile-menu__panel">
          <div className="app-mobile-menu__header">
            <div className="app-mobile-menu__brand">
              <PumpLogo size={28} />
              <span className="app-mobile-menu__brand-name">Pump</span>
            </div>
            <button
              type="button"
              className="app-mobile-menu__close"
              onClick={onClose}
              aria-label="Close menu"
            >
              <PumpIcon icon={faX} className="h-4 w-4" />
            </button>
          </div>

          <nav className="app-mobile-menu__nav" aria-label="Primary">
            {APP_NAV_ITEMS.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "app-mobile-menu__link app-mobile-menu__link--active"
                      : "app-mobile-menu__link"
                  }
                  onClick={onClose}
                >
                  <span className="app-mobile-menu__link-icon" aria-hidden>
                    <PumpIcon icon={item.icon} className="h-[1.125rem] w-[1.125rem]" />
                  </span>
                  <span className="app-mobile-menu__link-label">{item.label}</span>
                  <PumpIcon icon={faChevronRight} className="app-mobile-menu__link-chevron" />
                </Link>
              );
            })}
          </nav>

          <div className="app-mobile-menu__footer">
            <Link
              href="/create"
              prefetch={true}
              aria-current={pathname.startsWith("/create") ? "page" : undefined}
              className={`app-mobile-menu__create primary-button${
                pathname.startsWith("/create") ? " opacity-95" : ""
              }`}
              onClick={onClose}
            >
              <PumpIcon icon={faPlus} className="h-4 w-4 shrink-0" />
              Create token
            </Link>

            <div className="app-mobile-menu__theme-row">
              <span className="app-mobile-menu__theme-label">Appearance</span>
              <ThemePicker className="app-mobile-menu__theme-toggle" />
            </div>
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}

export function AppMobileMenuButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="app-header-menu-btn md:hidden"
      aria-expanded={open}
      aria-controls="app-mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={onClick}
    >
      <PumpIcon icon={open ? faX : faMenu} className="h-[1.125rem] w-[1.125rem]" />
    </button>
  );
}
