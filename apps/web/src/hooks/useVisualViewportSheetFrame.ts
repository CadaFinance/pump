"use client";

import { useEffect, useState, type CSSProperties } from "react";

const MOBILE_MQ = "(max-width: 1023px)";

export type VisualViewportSheetFrame = {
  backdropStyle: CSSProperties;
  hostStyle: CSSProperties;
  useVisualViewport: boolean;
};

const EMPTY_FRAME: VisualViewportSheetFrame = {
  backdropStyle: {},
  hostStyle: {},
  useVisualViewport: false,
};

/** Pin bottom sheets to the visible viewport so iOS keyboard does not cover them. */
export function useVisualViewportSheetFrame(enabled: boolean): VisualViewportSheetFrame {
  const [frame, setFrame] = useState<VisualViewportSheetFrame>(EMPTY_FRAME);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
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
      const top = vv.offsetTop;
      const height = vv.height;
      const shared: CSSProperties = {
        top: `${top}px`,
        height: `${height}px`,
        maxHeight: `${height}px`,
      };

      setFrame({
        backdropStyle: shared,
        hostStyle: shared,
        useVisualViewport: true,
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setFrame(EMPTY_FRAME);
    };
  }, [enabled]);

  return frame;
}
