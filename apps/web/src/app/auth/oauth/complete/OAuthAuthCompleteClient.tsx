"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { markPumpSessionHint, restorePumpKernelSession } from "@/lib/aa/pump-account";
import { ICON_STROKE } from "@/lib/icons";

export function OAuthAuthCompleteClient() {
  const searchParams = useSearchParams();
  const handledRef = useRef(false);
  const [message, setMessage] = useState("Completing sign-in…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const status = searchParams.get("status");
    const errorMessage = searchParams.get("message");
    const provider = searchParams.get("provider") ?? "account";

    if (status !== "ok") {
      setFailed(true);
      setMessage(errorMessage ?? "Sign-in could not be completed.");
      return;
    }

    void (async () => {
      try {
        markPumpSessionHint();
        await restorePumpKernelSession();
        window.location.replace("/");
      } catch (error) {
        setFailed(true);
        setMessage(
          error instanceof Error
            ? error.message
            : `Could not restore your ${provider} session.`
        );
      }
    })();
  }, [searchParams]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="modal-panel w-full max-w-[420px] px-6 py-8 text-center sm:px-8">
        <div
          className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border ${
            failed
              ? "border-pump-danger/35 bg-pump-danger/8"
              : "border-pump-border/35 bg-pump-border/6"
          }`}
        >
          <ShieldCheck
            className={`h-6 w-6 ${failed ? "text-pump-danger" : "text-pump-accent"}`}
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
        </div>
        <h1 className="text-h2 font-semibold tracking-tight text-pump-text">
          {failed ? "Sign-in failed" : "Signing you in"}
        </h1>
        <p className="mt-2 text-body-sm leading-relaxed text-pump-muted" role="status" aria-live="polite">
          {message}
        </p>
        {failed ? (
          <a
            href="/"
            className="primary-button mt-6 inline-flex min-h-[2.75rem] items-center justify-center px-5 text-body-sm"
          >
            Return to Pump
          </a>
        ) : null}
      </div>
    </main>
  );
}
