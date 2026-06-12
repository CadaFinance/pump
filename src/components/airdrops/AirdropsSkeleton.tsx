import { Skeleton } from "@/components/ui/Skeleton";

function AirdropRowSkeleton() {
  return (
    <div className="panel-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-sm" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function AirdropsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-pump-accent/20 bg-pump-card/92 p-4 shadow-panel">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-24 rounded-sm" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-lg" />

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>

      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <AirdropRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function AirdropDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="panel-surface overflow-hidden">
        <div className="border-b border-pump-border/15 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full md:h-16 md:w-16" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-7 w-24 rounded-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[5fr_7fr]">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
