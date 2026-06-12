"use client";

import { useIsTelegram } from "@/components/telegram/TelegramProvider";

export function OpenInTelegramBanner() {
  const isTelegram = useIsTelegram();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  if (isTelegram || !botUsername) return null;

  return (
    <div className="border-b border-pump-accent/30 bg-pump-card px-4 py-2 text-center text-sm text-pump-accent">
      Best experience in Telegram —{" "}
      <a
        className="underline"
        href={`https://t.me/${botUsername}?startapp`}
        rel="noreferrer"
        target="_blank"
      >
        Open Mini App
      </a>
    </div>
  );
}
