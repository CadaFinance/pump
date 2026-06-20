"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { ICON_STROKE } from "@/lib/icons";
import { formatTradeError } from "@/lib/trade-errors";

type TelegramLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type TelegramAuthConfig = {
  clientId: string;
  publicOrigin: string;
  redirectReady: boolean;
};

function TelegramBrandIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.417 15.181l-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.558 1.725.264 1.998-.929L23.93 3.821c.321-1.496-.541-2.081-1.527-1.732L1.293 9.738c-1.453.558-1.435 1.357-.248 1.715l5.918 1.846L18.916 5.87c.684-.451 1.307-.201.794.315" />
    </svg>
  );
}

export function TelegramLoginModal({ open, onClose, onSuccess }: TelegramLoginModalProps) {
  const onSuccessRef = useRef(onSuccess);
  const [config, setConfig] = useState<TelegramAuthConfig | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setPending(false);

    void fetch("/api/auth/telegram/config", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: TelegramAuthConfig;
          error?: string;
        };
        if (!response.ok || !body.data?.clientId) {
          throw new Error(body.error ?? "Telegram sign-in is not configured.");
        }
        setConfig(body.data);
      })
      .catch((err) => {
        setConfig(null);
        setError(formatTradeError(err));
      });
  }, [open]);

  const handleContinue = useCallback(async () => {
    if (!config?.clientId) {
      setError("Telegram sign-in is not configured yet.");
      return;
    }

    if (!config.redirectReady) {
      setError("Telegram sign-in is temporarily unavailable. Contact support.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/telegram/start", { cache: "no-store" });
      const body = (await response.json()) as { data?: { authUrl?: string }; error?: string };
      if (!response.ok || !body.data?.authUrl) {
        throw new Error(body.error ?? "Could not start sign-in.");
      }
      onSuccessRef.current();
      window.location.assign(body.data.authUrl);
    } catch (err) {
      setError(formatTradeError(err));
      setPending(false);
    }
  }, [config?.clientId, config?.redirectReady]);

  if (!open) return null;

  return (
    <ModalPortal open={open}>
      <>
        <button
          type="button"
          className="modal-backdrop modal-backdrop-dismiss z-[110] cursor-default transition-opacity"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          className="modal-backdrop-shell fixed inset-0 z-[111] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="telegram-login-title"
          aria-describedby="telegram-login-description"
        >
          <div className="modal-panel pointer-events-auto w-full max-w-[420px] overflow-hidden shadow-xl shadow-black/20">
            <div className="relative px-6 pt-8 pb-2 sm:px-8">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-md text-pump-muted transition hover:bg-pump-border/10 hover:text-pump-text disabled:opacity-40"
                aria-label="Close"
              >
                <span className="text-xl leading-none" aria-hidden>
                  ×
                </span>
              </button>

              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-pump-border/35 bg-pump-border/6">
                <ShieldCheck className="h-6 w-6 text-pump-accent" strokeWidth={ICON_STROKE} aria-hidden />
              </div>

              <div className="text-center">
                <h2
                  id="telegram-login-title"
                  className="text-h2 font-semibold tracking-tight text-pump-text"
                >
                  Sign in
                </h2>
                <p
                  id="telegram-login-description"
                  className="mx-auto mt-2 max-w-[18rem] text-body-sm leading-relaxed text-pump-muted sm:max-w-none"
                >
                  Authorize with Telegram to access your smart wallet, portfolio, and trading on BSC
                  Testnet.
                </p>
              </div>
            </div>

            <div className="border-t border-pump-border/30 px-6 py-6 sm:px-8">
              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={pending || !config?.clientId || !config?.redirectReady}
                className="flex w-full min-h-[3rem] items-center justify-center gap-3 rounded-lg border border-pump-border/55 bg-pump-card-soft px-4 text-body-sm font-semibold text-pump-text transition hover:border-pump-border hover:bg-pump-border/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pump-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <TelegramBrandIcon />
                {pending ? "Redirecting to Telegram…" : "Continue with Telegram"}
              </button>

              {error ? (
                <p
                  role="alert"
                  aria-live="polite"
                  className="notice-warning mt-4 text-left leading-snug"
                >
                  {error}
                </p>
              ) : null}

              <p className="mt-6 text-center text-caption leading-relaxed text-pump-muted">
                Secured connection · OIDC · No password required
              </p>
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
