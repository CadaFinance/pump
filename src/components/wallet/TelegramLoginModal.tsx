"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  createTelegramKernelSessionFromLegacy,
  createTelegramKernelSessionFromOidc,
  type TelegramAccountSession,
} from "@/lib/aa/telegram-account";
import { getTelegramLegacyRedirectUri } from "@/lib/telegram/oidc-constants";
import { telegramBotUsername } from "@/lib/telegram-config";
import {
  createTelegramLoginNonce,
  isLikelyMobileBrowser,
  openTelegramOidcPopup,
} from "@/lib/telegram/telegram-login-sdk";
import { formatTradeError } from "@/lib/trade-errors";
import { ModalPortal } from "@/components/ui/ModalPortal";

type TelegramLoginModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (session: TelegramAccountSession) => void;
};

type TelegramAuthConfig = {
  clientId: string;
  redirectReady: boolean;
};

function mountLegacyRedirectWidget(container: HTMLDivElement, botUsername: string, authUrl: string): void {
  container.innerHTML = "";

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;
  script.setAttribute("data-telegram-login", botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "8");
  script.setAttribute("data-auth-url", authUrl);
  script.setAttribute("data-request-access", "write");
  script.onerror = () => {
    container.dispatchEvent(new CustomEvent("pump-telegram-widget-error"));
  };
  container.appendChild(script);
}

export function TelegramLoginModal({ open, onClose, onSuccess }: TelegramLoginModalProps) {
  const onSuccessRef = useRef(onSuccess);
  const [config, setConfig] = useState<TelegramAuthConfig | null>(null);
  const [legacyRoot, setLegacyRoot] = useState<HTMLDivElement | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetHost, setWidgetHost] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [legacyWidgetMissing, setLegacyWidgetMissing] = useState(false);
  const isMobile = isLikelyMobileBrowser();

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!open) {
      setLegacyRoot(null);
      setShowLegacy(false);
      setLegacyWidgetMissing(false);
      return;
    }

    setWidgetHost(typeof window !== "undefined" ? window.location.hostname : "");
    setError(null);
    setPending(false);

    void fetch("/api/auth/telegram/config", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as {
          data?: TelegramAuthConfig;
          error?: string;
        };
        if (!response.ok || !body.data?.clientId) {
          throw new Error(body.error ?? "Telegram OIDC is not configured.");
        }
        setConfig(body.data);
      })
      .catch((err) => {
        setConfig(null);
        setError(formatTradeError(err));
      });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !showLegacy || !telegramBotUsername || !legacyRoot) return;

    const authUrl = getTelegramLegacyRedirectUri(window.location.origin);
    mountLegacyRedirectWidget(legacyRoot, telegramBotUsername, authUrl);
    setLegacyWidgetMissing(false);

    const onWidgetError = () => setLegacyWidgetMissing(true);
    legacyRoot.addEventListener("pump-telegram-widget-error", onWidgetError);

    const timer = window.setTimeout(() => {
      const hasWidget =
        legacyRoot.querySelector("iframe") ||
        legacyRoot.querySelector("a") ||
        legacyRoot.querySelector("script[data-telegram-login]");
      if (!hasWidget && legacyRoot.childElementCount === 0) {
        setLegacyWidgetMissing(true);
      }
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      legacyRoot.removeEventListener("pump-telegram-widget-error", onWidgetError);
      legacyRoot.innerHTML = "";
    };
  }, [open, showLegacy, legacyRoot]);

  const completeOidcLogin = useCallback(async (idToken: string, nonce: string) => {
    const session = await createTelegramKernelSessionFromOidc({ idToken, nonce });
    onSuccessRef.current(session);
  }, []);

  const handleOidcPopup = useCallback(async () => {
    if (!config?.clientId) {
      setError("Telegram login is not configured yet.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const nonce = createTelegramLoginNonce();
      const { idToken } = await openTelegramOidcPopup({
        clientId: config.clientId,
        nonce,
      });
      await completeOidcLogin(idToken, nonce);
    } catch (err) {
      setError(formatTradeError(err));
    } finally {
      setPending(false);
    }
  }, [completeOidcLogin, config?.clientId]);

  const handleOidcRedirect = useCallback(async () => {
    if (!config?.redirectReady) {
      setError("Telegram app login requires TELEGRAM_OIDC_CLIENT_SECRET on the server.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/telegram/start", { cache: "no-store" });
      const body = (await response.json()) as { data?: { authUrl?: string }; error?: string };
      if (!response.ok || !body.data?.authUrl) {
        throw new Error(body.error ?? "Could not start Telegram login.");
      }
      window.location.assign(body.data.authUrl);
    } catch (err) {
      setError(formatTradeError(err));
      setPending(false);
    }
  }, [config?.redirectReady]);

  const telegramAppUrl =
    telegramBotUsername && typeof window !== "undefined"
      ? `https://t.me/${telegramBotUsername}`
      : null;

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
                  Opens Telegram for approval, then restores your Pump smart wallet on this device.
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
                <div className="rounded-lg border border-pump-border/45 bg-pump-border/4 px-3 py-3 text-caption text-pump-muted">
                  <p>
                    @BotFather → <code className="font-mono">/setdomain</code> and Web Login Allowed URLs
                    must include{" "}
                    <code className="font-mono text-pump-text">{widgetHost || "…"}</code>
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleOidcPopup()}
                  disabled={pending || !config?.clientId}
                  className="primary-button w-full py-2.5 text-body-sm disabled:opacity-50"
                >
                  {pending ? "Waiting for Telegram…" : "Continue with Telegram"}
                </button>

                {isMobile ? (
                  <button
                    type="button"
                    onClick={() => void handleOidcRedirect()}
                    disabled={pending || !config?.redirectReady}
                    className="secondary-button w-full py-2.5 text-body-sm disabled:opacity-50"
                  >
                    Open in Telegram app
                  </button>
                ) : null}

                {telegramAppUrl ? (
                  <a
                    href={telegramAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-button block w-full py-2.5 text-center text-body-sm"
                  >
                    Open @{telegramBotUsername} in Telegram
                  </a>
                ) : null}
              </div>

              <div className="rounded-lg border border-pump-border/30 bg-pump-border/4 px-3 py-3 text-caption text-pump-muted">
                <p>
                  Mobile tip: use <strong>Open in Telegram app</strong> if the popup asks for a phone
                  number. We do not request your phone scope — only Telegram profile + bot messages.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLegacy((current) => !current)}
                className="text-caption text-pump-muted underline-offset-2 hover:text-pump-text hover:underline"
              >
                {showLegacy ? "Hide legacy login" : "Having trouble? Try legacy redirect login"}
              </button>

              {showLegacy && telegramBotUsername ? (
                <div className="space-y-3 rounded-lg border border-pump-border/45 bg-pump-border/4 p-3">
                  <p className="text-caption text-pump-muted">
                    Legacy redirect widget — useful when OIDC popup is blocked on mobile browsers.
                  </p>
                  <div className="flex min-h-[56px] items-center justify-center">
                    <div ref={setLegacyRoot} className="flex min-h-[44px] w-full justify-center" />
                  </div>
                  {legacyWidgetMissing ? (
                    <p className="notice-warning leading-snug">
                      Legacy widget did not load. Confirm BotFather domain and Allowed URLs include this
                      host.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!telegramBotUsername ? (
                <p className="text-caption text-pump-muted">
                  Set <code className="font-mono">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> and OIDC client
                  id in <code className="font-mono">.env</code>, then restart the dev server.
                </p>
              ) : null}

              {pending ? <p className="text-caption text-pump-muted">Waiting for Telegram approval…</p> : null}
              {error ? <p className="notice-warning leading-snug">{error}</p> : null}
            </div>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
