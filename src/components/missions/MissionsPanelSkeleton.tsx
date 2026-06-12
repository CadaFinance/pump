import { Skeleton } from "@/components/ui/Skeleton";

export function MissionsPanelSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="rounded-lg border border-pump-accent/20 bg-pump-card/92 p-3 shadow-panel md:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-sm" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      <div className="divide-y divide-pump-border/10 rounded-lg border border-pump-border/15">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-full max-w-sm" />
            <Skeleton className="mt-3 h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
