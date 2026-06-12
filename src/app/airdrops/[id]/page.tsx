import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AirdropDetailPanel } from "@/components/airdrops/AirdropDetailPanel";

type PageProps = { params: Promise<{ id: string }> };

export default async function AirdropDetailPage({ params }: PageProps) {
  const { id } = await params;

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
        </div>
        <AirdropDetailPanel airdropId={id} />
      </div>
    </AppShell>
  );
}
