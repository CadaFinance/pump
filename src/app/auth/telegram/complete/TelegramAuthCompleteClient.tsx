"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  markTelegramSessionHint,
  restoreTelegramKernelSession,
} from "@/lib/aa/telegram-account";

export function TelegramAuthCompleteClient() {
  const searchParams = useSearchParams();
  const handledRef = useRef(false);
  const [message, setMessage] = useState("Finishing Telegram sign-in…");

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const status = searchParams.get("status");
    const errorMessage = searchParams.get("message");

    if (status !== "ok") {
      setMessage(errorMessage ?? "Telegram sign-in failed.");
      return;
    }

    void (async () => {
      try {
        markTelegramSessionHint();
        await restoreTelegramKernelSession();
        window.location.replace("/");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not restore Telegram session.");
      }
    })();
  }, [searchParams]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-body-sm text-pump-muted">{message}</p>
    </main>
  );
}
