"use client";

import { useEffect, useRef } from "react";
import { captureReferrerFromUrl } from "@/lib/referral-storage";

/** Captures ?ref= from URL into sessionStorage; binding happens on first trade. */
export function ReferralCaptureProvider({ children }: { children: React.ReactNode }) {
  const capturedRef = useRef(false);

  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;
    captureReferrerFromUrl();
  }, []);

  return children;
}
