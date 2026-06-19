"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createTelegramKernelSessionFromWidget,
  type TelegramAccountSession,
} from "@/lib/aa/telegram-account";
import { telegramBotUsername } from "@/lib/telegram-config";
import type { TelegramLoginPayload } from "@/lib/telegram/verify-login";
import { formatTradeError } from "@/lib/trade-errors";
import { ModalPortal } from "@/components/ui/ModalPortal";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

type TelegramLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (session: TelegramAccountSession) => void;
};

function mountTelegramWidget(container: HTMLDivElement, botUsername: string): void {
  container.innerHTML = "";

  window.onTelegramAuth = (user) => {
    container.dispatchEvent(new CustomEvent("pump-telegram-auth", { detail: user }));
  };

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;
  script.setAttribute("data-telegram-login", botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "8");
  script.setAttribute("data-onauth", "onTelegramAuth(user)");
  script.setAttribute("data-request-access", "write");
  script.onerror = () => {
    container.dispatchEvent(new CustomEvent("pump-telegram-widget-error"));
  };
  container.appendChild(script);
}

export function TelegramLoginModal({ open, onClose, onSuccess }: TelegramLoginModalProps) {
  const onSuccessRef = useRef(onSuccess);
  const [widgetRoot, setWidgetRoot] = useState<HTMLDivElement | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetHost, setWidgetHost] = useState("");
  const [widgetMissing, setWidgetMissing] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) {
      setWidgetRoot(null);
      return;
    }
    setWidgetHost(typeof window !== "undefined" ? window.location.hostname : "");
    setWidgetMissing(false);
    setError(null);
    setPending(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !telegramBotUsername || !widgetRoot) return;

    mountTelegramWidget(widgetRoot, telegramBotUsername);
    setWidgetMissing(false);

    const onAuth = (event: Event) => {
      const user = (event as CustomEvent<TelegramLoginPayload>).detail;
      void (async () => {
        setPending(true);
        setError(null);
        try {
          const session = await createTelegramKernelSessionFromWidget(user);
          onSuccessRef.current(session);
        } catch (err) {
          setError(formatTradeError(err));
        } finally {
          setPending(false);
        }
      })();
    };

    const onWidgetError = () => {
      setWidgetMissing(true);
      setError("Could not load Telegram login script. Check CSP or ad-blocker.");
    };

    widgetRoot.addEventListener("pump-telegram-auth", onAuth);
    widgetRoot.addEventListener("pump-telegram-widget-error", onWidgetError);

    const timer = window.setTimeout(() => {
      const hasWidget =
        widgetRoot.querySelector("iframe") ||
        widgetRoot.querySelector("a") ||
        widgetRoot.querySelector("script[data-telegram-login]");
      if (!hasWidget && widgetRoot.childElementCount === 0) {
        setWidgetMissing(true);
      }
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      widgetRoot.removeEventListener("pump-telegram-auth", onAuth);
      widgetRoot.removeEventListener("pump-telegram-widget-error", onWidgetError);
      delete window.onTelegramAuth;
      widgetRoot.innerHTML = "";
    };
  }, [open, telegramBotUsername, widgetRoot]);

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
          aria-labelledby="telegram-login-title"
        >
          <div className="modal-panel modal-sheet-panel max-w-md rounded-t-2xl border-x-0 border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-xl sm:border-x sm:border-b sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-pump-border/45 pb-3">
              <div className="min-w-0">
                <h2 id="telegram-login-title" className="text-h3 font-semibold text-pump-text">
                  Sign in with Telegram
                </h2>
                <p className="mt-0.5 text-caption text-pump-muted">
                  Connect your Telegram account to open your Pump smart wallet on this device.
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
              {telegramBotUsername ? (
                <>
                  <div className="rounded-lg border border-pump-border/45 bg-pump-border/4 px-3 py-3 text-caption text-pump-muted">
                    <p>
                      @BotFather <code className="font-mono">/setdomain</code> →{" "}
                      <code className="font-mono text-pump-text">{widgetHost || "…"}</code>
                    </p>
                  </div>

                  <div className="flex min-h-[56px] items-center justify-center rounded-lg border border-pump-border/45 bg-pump-border/4 px-3 py-4">
                    <div
                      ref={setWidgetRoot}
                      className="flex min-h-[44px] w-full justify-center"
                    />
                  </div>

                  {widgetMissing ? (
                    <p className="notice-warning leading-snug">
                      Telegram button did not load. Check BotFather domain matches the host above. In
                      Network tab filter by <strong>JS</strong> (not XHR) — you should see{" "}
                      <code className="font-mono">telegram-widget.js</code>.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-caption text-pump-muted">
                  Set <code className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> in{" "}
                  <code className="font-mono">.env</code> and restart the dev server.
                </p>
              )}

              {pending ? (
                <p className="text-caption text-pump-muted">Opening wallet…</p>
              ) : null}

              {error ? <p className="notice-warning leading-snug">{error}</p> : null}
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
