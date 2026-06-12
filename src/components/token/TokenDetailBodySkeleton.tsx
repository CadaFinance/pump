import { Skeleton } from "@/components/ui/Skeleton";

export function TokenDetailBodySkeleton() {
  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Skeleton className="h-[360px] w-full rounded-lg" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="panel-surface p-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mx-auto mt-6 h-10 w-24" />
          <Skeleton className="mt-6 h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
