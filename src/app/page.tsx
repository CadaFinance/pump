import { AppShell } from "@/components/layout/AppShell";
import { ArenaListClient } from "@/components/arena/ArenaListClient";
import { fetchArenaHomePayload } from "@/lib/arena-server";

export default async function HomePage() {
  let initialPayload = null;
  try {
    initialPayload = await fetchArenaHomePayload({
      filter: "new",
      sortKey: "age",
      sortDir: "desc",
    });
  } catch {
    // Client retries on hydration if SSR fetch fails.
  }

  return (
    <AppShell>
      <ArenaListClient initialPayload={initialPayload} />
    </AppShell>
  );
}
