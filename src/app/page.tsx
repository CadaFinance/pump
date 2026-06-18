import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ArenaHomeServer } from "@/components/arena/ArenaHomeServer";

export default function HomePage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <ArenaHomeServer />
      </Suspense>
    </AppShell>
  );
}
