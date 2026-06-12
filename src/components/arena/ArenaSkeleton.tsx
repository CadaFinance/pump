import { Skeleton } from "@/components/ui/Skeleton";

function TokenCardSkeleton() {
  return (
    <div className="panel-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-14 rounded-sm" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function ArenaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-pump-accent/20 bg-pump-card/92 p-4 shadow-panel">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-6 w-24" />
        <Skeleton className="mt-1 h-4 w-36" />
      </div>

      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <TokenCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
