"use client";

import { useEffect, useState, type CSSProperties } from "react";

const MOBILE_MQ = "(max-width: 1023px)";

export type VisualViewportSheetFrame = {
  hostStyle: CSSProperties;
  /** Lift sheet host to sit above the software keyboard. */
  useVisualViewport: boolean;
  keyboardOpen: boolean;
};

const EMPTY_FRAME: VisualViewportSheetFrame = {
  hostStyle: {},
  useVisualViewport: false,
  keyboardOpen: false,
};

/**
 * Pin a bottom sheet to visualViewport while an input is focused (iOS keyboard).
 * When `active` is false the sheet returns to the default bottom anchor.
 */
export function useVisualViewportSheetFrame(active: boolean): VisualViewportSheetFrame {
  const [frame, setFrame] = useState<VisualViewportSheetFrame>(EMPTY_FRAME);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      setFrame(EMPTY_FRAME);
      return;
    }

    if (!window.matchMedia(MOBILE_MQ).matches) {
      setFrame(EMPTY_FRAME);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setFrame({
        hostStyle: {
          top: `${vv.offsetTop}px`,
          height: `${vv.height}px`,
          maxHeight: `${vv.height}px`,
        },
        useVisualViewport: true,
        keyboardOpen: true,
      });
    };

    const scheduleUpdate = () => {
      update();
      requestAnimationFrame(update);
    };

    scheduleUpdate();
    vv.addEventListener("resize", scheduleUpdate);
    vv.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      vv.removeEventListener("resize", scheduleUpdate);
      vv.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      setFrame(EMPTY_FRAME);
    };
  }, [active]);

  return frame;
}
