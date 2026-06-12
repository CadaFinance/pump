import { AppShell } from "@/components/layout/AppShell";
import { AirdropsListClient } from "@/components/airdrops/AirdropsListClient";

export default function AirdropsPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <h2 className="section-heading">Airdrops</h2>
          <p className="mt-1 hidden text-body-sm text-pump-muted md:block">
            Holder and buyer campaigns with on-chain escrow and Merkle claims.
          </p>
        </div>
        <AirdropsListClient />
      </div>
    </AppShell>
  );
}
