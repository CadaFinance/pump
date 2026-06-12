import { AppShell } from "@/components/layout/AppShell";
import { ArenaListClient } from "@/components/arena/ArenaListClient";

export default function HomePage() {
  return (
    <AppShell>
      <h2 className="section-heading mb-2 md:mb-4">King of the Hill</h2>

      <ArenaListClient />
    </AppShell>
  );
}
