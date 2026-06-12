import { AppShell } from "@/components/layout/AppShell";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminGate>
        <div className="space-y-4">
          <div>
            <h2 className="section-heading">Admin</h2>
            <p className="mt-1 text-body-sm text-pump-muted">
              Treasury fees, airdrop escrow, and remainder sweeps.
            </p>
          </div>
          <AdminPanel />
        </div>
      </AdminGate>
    </AppShell>
  );
}
