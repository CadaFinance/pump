import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CreateAirdropForm } from "@/components/airdrops/CreateAirdropForm";

export default function CreateAirdropPage() {
  return (
    <AppShell>
      <div className="space-y-3 md:space-y-4">
        <div>
          <Link
            href="/airdrops"
            className="text-caption font-medium text-pump-muted transition hover:text-pump-accent"
          >
            ← Airdrops
          </Link>
          <h2 className="section-heading mt-1">Create campaign</h2>
          <p className="mt-1 hidden text-body-sm text-pump-muted md:block">
            Fund an on-chain escrow pool. TOP 100 holders and buyers split rewards after the
            qualification window ends.
          </p>
        </div>
        <CreateAirdropForm />
      </div>
    </AppShell>
  );
}
