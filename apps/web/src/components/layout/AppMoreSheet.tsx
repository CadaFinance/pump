"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useMobileModalClose } from "@/hooks/useMobileModalScrollLock";
import { APP_MORE_NAV_ITEMS, isNavActive } from "@/lib/nav-config";
import { PumpIcon, faChevronRight } from "@/lib/icons";

type AppMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
};

export function AppMoreSheet({ open, onClose, pathname }: AppMoreSheetProps) {
  const handleClose = useMobileModalClose(onClose);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  return (
    <ModalPortal open={open}>
      <>
        <button
          type="button"
          className="modal-backdrop modal-backdrop-dismiss z-[100] cursor-default transition-opacity"
          aria-label="Close menu"
          onClick={handleClose}
        />
        <div
          className="modal-sheet-host z-[101] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More options"
        >
          <div className="modal-panel modal-sheet-panel app-more-sheet pointer-events-auto max-h-[min(70dvh,420px)] overflow-hidden border-x-0 border-b-0 rounded-t-2xl">
            <div className="app-more-sheet__header">
              <h2 className="app-more-sheet__title">More</h2>
              <button
                type="button"
                onClick={handleClose}
                className="app-more-sheet__close"
                aria-label="Close"
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <nav className="app-more-sheet__nav" aria-label="Secondary">
              {APP_MORE_NAV_ITEMS.map((item) => {
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "app-more-sheet__link app-more-sheet__link--active"
                        : "app-more-sheet__link"
                    }
                    onClick={handleClose}
                  >
                    <span className="app-more-sheet__link-icon" aria-hidden>
                      <PumpIcon icon={item.icon} className="h-[1.125rem] w-[1.125rem]" />
                    </span>
                    <span className="app-more-sheet__link-label">{item.label}</span>
                    <PumpIcon icon={faChevronRight} className="app-more-sheet__link-chevron" />
                  </Link>
                );
              })}
            </nav>

            <div className="app-more-sheet__footer">
              <div className="app-more-sheet__theme-row">
                <span className="app-more-sheet__theme-label">Appearance</span>
                <ThemePicker className="app-more-sheet__theme-toggle" />
              </div>
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
