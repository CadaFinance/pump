"use client";

import { useEffect } from "react";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    webApp.ready?.();
    webApp.expand?.();
  }, []);

  return <>{children}</>;
}

export function useIsTelegram(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.Telegram?.WebApp?.initData);
}
