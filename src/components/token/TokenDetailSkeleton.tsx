import { AppShell } from "@/components/layout/AppShell";
import { TokenDetailBodySkeleton } from "@/components/token/TokenDetailBodySkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function TokenDetailSkeleton() {
  return (
    <AppShell wide>
      <Skeleton className="h-4 w-28" />
      <TokenDetailBodySkeleton />
    </AppShell>
  );
}
