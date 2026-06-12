import { AppShell } from "@/components/layout/AppShell";
import { PortfolioPanelSkeleton } from "@/components/portfolio/PortfolioPanelSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <PortfolioPanelSkeleton />
    </AppShell>
  );
}
