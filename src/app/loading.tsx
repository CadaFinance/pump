import { AppShell } from "@/components/layout/AppShell";

/** Keep header/nav visible during route transitions — no skeleton or blank flash. */
export default function Loading() {
  return (
    <AppShell>
      <div className="min-w-0 space-y-3 md:space-y-4" aria-busy="true" aria-label="Loading" />
    </AppShell>
  );
}
