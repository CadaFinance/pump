import { AppShell } from "@/components/layout/AppShell";
import { TokenDetailBodySkeleton } from "@/components/token/TokenDetailBodySkeleton";

export function TokenDetailSkeleton() {
  return (
    <AppShell wide>
      <TokenDetailBodySkeleton />
    </AppShell>
  );
}
