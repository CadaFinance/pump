import { AppShell } from "@/components/layout/AppShell";
import { MissionsPanel } from "@/components/missions/MissionsPanel";
import { SectionHeadingIcon } from "@/components/ui/IconLabel";
import { MetricIcons } from "@/lib/metric-icons";

export default function MissionsPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <SectionHeadingIcon icon={MetricIcons.missions}>Missions</SectionHeadingIcon>
          <p className="mt-1 text-caption text-pump-muted md:text-body-sm">
            Earn Pump Points from on-chain activity.
          </p>
        </div>

        <MissionsPanel />
      </div>
    </AppShell>
  );
}
