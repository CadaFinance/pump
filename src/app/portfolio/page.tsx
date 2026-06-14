import { AppShell } from "@/components/layout/AppShell";
import { PortfolioPanel } from "@/components/portfolio/PortfolioPanel";
import { SectionHeadingIcon } from "@/components/ui/IconLabel";
import { MetricIcons } from "@/lib/metric-icons";

export default function PortfolioPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <SectionHeadingIcon icon={MetricIcons.portfolio}>Portfolio</SectionHeadingIcon>
          <p className="mt-1 hidden text-body-sm text-pump-muted md:block">
            Holdings, creator fees, and tokens you launched.
          </p>
        </div>

        <PortfolioPanel />
      </div>
    </AppShell>
  );
}
