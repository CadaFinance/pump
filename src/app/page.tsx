import { AppShell } from "@/components/layout/AppShell";
import { ArenaListClient } from "@/components/arena/ArenaListClient";
import { SectionHeadingIcon } from "@/components/ui/IconLabel";
import { MetricIcons } from "@/lib/metric-icons";

export default function HomePage() {
  return (
    <AppShell>
      <SectionHeadingIcon icon={MetricIcons.kingOfHill} className="mb-2 md:mb-4">
        King of the Hill
      </SectionHeadingIcon>

      <ArenaListClient />
    </AppShell>
  );
}
