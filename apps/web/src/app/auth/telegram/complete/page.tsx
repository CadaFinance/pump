import { Suspense } from "react";
import { TelegramAuthCompleteClient } from "./TelegramAuthCompleteClient";

export default function TelegramAuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center px-4">
          <p className="text-body-sm text-pump-muted">Finishing Telegram sign-in…</p>
        </main>
      }
    >
      <TelegramAuthCompleteClient />
    </Suspense>
  );
}
