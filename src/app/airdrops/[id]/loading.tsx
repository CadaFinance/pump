import { AppShellFrame } from "@/components/layout/AppShell";
import { PageBackLink } from "@/components/ui/PageBackLink";
import { AirdropDetailSkeleton } from "@/components/airdrops/AirdropsSkeleton";

export default function Loading() {
  return (
    <AppShellFrame pathname="/airdrops">
      <div className="min-w-0 space-y-3 md:space-y-4">
        <PageBackLink href="/airdrops" />
        <AirdropDetailSkeleton />
      </div>
    </AppShellFrame>
  );
}
