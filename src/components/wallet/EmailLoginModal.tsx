"use client";

import { useEffect, useState } from "react";
import {
  createEmailKernelSession,
  isValidEmail,
  type EmailAccountSession,
} from "@/lib/aa/email-account";
import { formatTradeError } from "@/lib/trade-errors";
import { ModalPortal } from "@/components/ui/ModalPortal";

type EmailLoginModalProps = {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
  onSuccess: (session: EmailAccountSession) => void;
};

export function EmailLoginModal({
  open,
  initialEmail,
  onClose,
  onSuccess,
}: EmailLoginModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError(null);
      setPending(false);
    }
  }, [open, initialEmail]);

  async function onContinue() {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const session = await createEmailKernelSession(email);
      onSuccess(session);
    } catch (err) {
      setError(formatTradeError(err));
    } finally {
      setPending(false);
    }
  }

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
          className="modal-sheet-host z-[111]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-login-title"
        >
          <div className="modal-panel modal-sheet-panel max-w-md rounded-t-2xl border-x-0 border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:border-x sm:border-b sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-pump-border/45 pb-3">
              <div className="min-w-0">
                <h2 id="email-login-title" className="text-h3 font-semibold text-pump-text">
                  Sign in
                </h2>
                <p className="mt-0.5 text-caption text-pump-muted">
                  Enter your email to open your Pump smart wallet on this device.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-pump-muted transition hover:bg-pump-border/10 hover:text-pump-text"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="field-label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="field-input mt-1.5 w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={pending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void onContinue();
                  }}
                />
                <p className="mt-1 text-caption text-pump-muted">
                  Your smart wallet is tied to this email and restored from the server on any device.
                  Fund the smart wallet with BNB for gas.
                </p>
              </div>

              {error ? <p className="notice-warning leading-snug">{error}</p> : null}

              <button
                type="button"
                onClick={() => void onContinue()}
                className="primary-button w-full"
                disabled={pending}
              >
                {pending ? "Opening wallet…" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
