import { Suspense } from "react";
import { AppShellFrame } from "@/components/layout/AppShell";
import { PageBackLink } from "@/components/ui/PageBackLink";
import { AirdropDetailPageLoader } from "@/components/airdrops/AirdropDetailPageLoader";
import { AirdropDetailSkeleton } from "@/components/airdrops/AirdropsSkeleton";

type PageProps = { params: Promise<{ id: string }> };

export default async function AirdropDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <AppShellFrame pathname="/airdrops">
          <div className="min-w-0 space-y-3 md:space-y-4">
            <PageBackLink href="/airdrops" />
            <AirdropDetailSkeleton />
          </div>
        </AppShellFrame>
      }
    >
      <AirdropDetailPageLoader airdropId={id} />
    </Suspense>
  );
}
