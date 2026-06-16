"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

type ScrollStripTrackProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

function bindHorizontalScroll(node: HTMLDivElement) {
  const canScroll = () => node.scrollWidth > node.clientWidth + 1;

  const onWheel = (event: WheelEvent) => {
    if (!canScroll()) return;

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) return;

    const before = node.scrollLeft;
    node.scrollLeft += delta;
    if (node.scrollLeft !== before) {
      event.preventDefault();
    }
  };

  node.addEventListener("wheel", onWheel, { passive: false });

  const cleanups: Array<() => void> = [() => node.removeEventListener("wheel", onWheel)];

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !canScroll()) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = node.scrollLeft;
      dragged = false;
      node.setPointerCapture(pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) dragged = true;
      if (!dragged) return;
      node.scrollLeft = startScrollLeft - dx;
      event.preventDefault();
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const id = pointerId;
      pointerId = -1;
      try {
        node.releasePointerCapture(id);
      } catch {
        // ignore
      }
      if (dragged) {
        const blockClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          node.removeEventListener("click", blockClick, true);
        };
        node.addEventListener("click", blockClick, true);
      }
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerEnd);
    node.addEventListener("pointercancel", onPointerEnd);

    cleanups.push(
      () => node.removeEventListener("pointerdown", onPointerDown),
      () => node.removeEventListener("pointermove", onPointerMove),
      () => node.removeEventListener("pointerup", onPointerEnd),
      () => node.removeEventListener("pointercancel", onPointerEnd)
    );
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

/**
 * Horizontally scrollable chip row. Viewport scrolls; inner track sizes to content.
 */
export function ScrollStripTrack({
  children,
  className = "",
  "aria-label": ariaLabel,
}: ScrollStripTrackProps) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!node) return;
    cleanupRef.current = bindHorizontalScroll(node);
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <div
      ref={setViewportRef}
      className={`scroll-strip-row__viewport min-w-0 ${className}`.trim()}
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
    >
      <div className="scroll-strip-row__track">{children}</div>
    </div>
  );
}
