import { AppShell } from "@/components/layout/AppShell";
import { MissionsPanel } from "@/components/missions/MissionsPanel";

export default function MissionsPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <h2 className="section-heading">Missions</h2>
          <p className="mt-1 hidden text-body-sm text-pump-muted md:block">
            Complete on-chain tasks to earn Pump Points for our upcoming app airdrop. This is
            separate from token campaigns on the Airdrops tab.
          </p>
        </div>

        <MissionsPanel />
      </div>
    </AppShell>
  );
}
