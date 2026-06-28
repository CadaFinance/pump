"use client";

import type { ReactNode } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { PumpIcon, faX } from "@/lib/icons";

type ToolbarSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
};

export function ToolbarSheet({
  open,
  onClose,
  ariaLabel,
  title,
  icon,
  count,
  children,
}: ToolbarSheetProps) {
  return (
    <ModalPortal open={open}>
      <div
        className="modal-backdrop modal-backdrop-shell z-50"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-default"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
        />
        <div className="toolbar-sheet modal-panel pointer-events-auto relative flex max-h-[min(80vh,32rem)] w-full max-w-lg flex-col overflow-hidden">
          <div className="toolbar-sheet-header">
            <div className="toolbar-sheet-header__title">
              <span className="toolbar-sheet-header__icon" aria-hidden>
                {icon}
              </span>
              <h2 className="toolbar-sheet-header__label">{title}</h2>
              {count != null && count > 0 ? (
                <span className="toolbar-sheet-header__count financial-value">({count})</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="toolbar-sheet-header__close"
              aria-label="Close"
            >
              <PumpIcon icon={faX} className="h-4 w-4" />
            </button>
          </div>
          <div className="toolbar-sheet-body min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}
