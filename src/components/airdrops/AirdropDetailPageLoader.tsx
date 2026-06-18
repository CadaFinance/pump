import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageBackLink } from "@/components/ui/PageBackLink";
import { AirdropDetailPanel } from "@/components/airdrops/AirdropDetailPanel";

type AirdropDetailPageLoaderProps = {
  airdropId: string;
};

/** Dynamic server island — keeps AppShell inside Suspense for Cache Components prerender. */
export async function AirdropDetailPageLoader({ airdropId }: AirdropDetailPageLoaderProps) {
  await connection();

  return (
    <AppShell>
      <div className="min-w-0 space-y-3 md:space-y-4">
        <PageBackLink href="/airdrops" />
        <AirdropDetailPanel airdropId={airdropId} />
      </div>
    </AppShell>
  );
}
