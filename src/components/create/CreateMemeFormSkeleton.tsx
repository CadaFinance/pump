import { Skeleton } from "@/components/ui/Skeleton";

export function CreateMemeFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading create form">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <Skeleton className="mb-1 h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}

      <div>
        <Skeleton className="mb-1 h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="mt-2 h-3 w-full max-w-sm" />
        <div className="mt-2 space-y-2 rounded-md border border-pump-border/20 bg-pump-surface/65 px-3 py-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[85%]" />
          <Skeleton className="h-3 w-[65%]" />
        </div>
      </div>

      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}
