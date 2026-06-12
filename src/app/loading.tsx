import { AppShell } from "@/components/layout/AppShell";
import { ArenaSkeleton } from "@/components/arena/ArenaSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <ArenaSkeleton />
    </AppShell>
  );
}
