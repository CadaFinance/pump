import { AppShell } from "@/components/layout/AppShell";
import { CreateAirdropForm } from "@/components/airdrops/CreateAirdropForm";

export default function CreateAirdropPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h2 className="section-heading">Create Airdrop</h2>
          <p className="mt-1 text-body-sm text-pump-muted">
            Deposit BNB or a platform token into escrow. TOP 100 holders/buyers split rewards after qualify ends.
          </p>
        </div>
        <CreateAirdropForm />
      </div>
    </AppShell>
  );
}
