import { AppShell } from "@/components/layout/AppShell";
import { PortfolioPanel } from "@/components/portfolio/PortfolioPanel";

export default function PortfolioPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <h2 className="section-heading">Portfolio</h2>
          <p className="mt-1 hidden text-body-sm text-pump-muted md:block">
            Holdings, creator fees, and tokens you launched.
          </p>
        </div>

        <PortfolioPanel />
      </div>
    </AppShell>
  );
}
