import { AppShell } from "@/components/layout/AppShell";
import { AirdropDetailPanel } from "@/components/airdrops/AirdropDetailPanel";

type PageProps = { params: Promise<{ id: string }> };

export default async function AirdropDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <AirdropDetailPanel airdropId={id} />
    </AppShell>
  );
}
