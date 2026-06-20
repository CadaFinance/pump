"use client";

import { TELEGRAM_LOGIN_SCRIPT_URL } from "@/lib/telegram/oidc-constants";

export type TelegramOidcAuthResult =
  | {
      id_token: string;
      user?: Record<string, unknown>;
    }
  | {
      error: string;
    };

export type TelegramLoginSdk = {
  auth: (
    options: {
      client_id: string | number;
      request_access?: Array<"phone" | "write">;
      lang?: string;
      nonce?: string;
    },
    callback: (result: TelegramOidcAuthResult) => void
  ) => void;
  open?: (callback?: (result: TelegramOidcAuthResult) => void) => void;
  init?: (
    options: {
      client_id: string | number;
      request_access?: Array<"phone" | "write">;
      lang?: string;
      nonce?: string;
    },
    callback: (result: TelegramOidcAuthResult) => void
  ) => void;
};

declare global {
  interface Window {
    Telegram?: {
      Login?: TelegramLoginSdk;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadTelegramLoginScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Telegram Login SDK is browser-only."));
  }

  if (window.Telegram?.Login?.auth) {
    return Promise.resolve();
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${TELEGRAM_LOGIN_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Telegram Login SDK failed to load.")), {
          once: true,
        });
        if (window.Telegram?.Login?.auth) resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = TELEGRAM_LOGIN_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Telegram Login SDK failed to load."));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

export function createTelegramLoginNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function openTelegramOidcPopup(input: {
  clientId: string;
  nonce: string;
}): Promise<{ idToken: string }> {
  return loadTelegramLoginScript().then(
    () =>
      new Promise((resolve, reject) => {
        const login = window.Telegram?.Login;
        if (!login?.auth) {
          reject(new Error("Telegram Login SDK is unavailable."));
          return;
        }

        login.auth(
          {
            client_id: input.clientId,
            request_access: ["write"],
            nonce: input.nonce,
          },
          (result) => {
            if ("error" in result && result.error) {
              reject(new Error(result.error));
              return;
            }
            if (!("id_token" in result) || !result.id_token) {
              reject(new Error("Telegram login was cancelled."));
              return;
            }
            resolve({ idToken: result.id_token });
          }
        );
      })
  );
}

export function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
