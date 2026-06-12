import { AppShell } from "@/components/layout/AppShell";
import { MissionsPanelSkeleton } from "@/components/missions/MissionsPanelSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <MissionsPanelSkeleton />
    </AppShell>
  );
}
