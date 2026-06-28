import {
  SkeletonChartPanel,
  SkeletonTradePanel,
} from "@/components/ui/skeleton-parts";
import { Skeleton } from "@/components/ui/Skeleton";

export function TokenDetailBodySkeleton() {
  const toolbarSkeleton = (
    <div className="token-detail-toolbar panel-surface">
      <div className="token-detail-toolbar__row">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        <div className="token-detail-toolbar__pair">
          <Skeleton variant="circle" className="h-7 w-7 shrink-0" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="token-detail-toolbar__stats">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="token-detail-toolbar__stat">
              <Skeleton variant="line" className="h-3 w-14" />
              <Skeleton className="mt-1 h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="token-page" aria-busy="true" aria-label="Loading token">
      <div className="token-page-grid">
        <div className="token-page-toolbar-slot hidden lg:block">{toolbarSkeleton}</div>

        <div className="token-page-stack token-page-stack--sidebar hidden lg:flex">
          <section className="token-market-sidebar panel-surface">
            <div className="token-market-sidebar__toolbar">
              <Skeleton className="h-8 w-full rounded-md" />
              <div className="mt-2 flex gap-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
            <div className="token-market-sidebar__list p-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="mb-2 h-8 w-full rounded-sm" />
              ))}
            </div>
          </section>
        </div>

        <div className="token-page-stack token-page-stack--main">
          <div className="shrink-0 lg:hidden">{toolbarSkeleton}</div>
          <div className="token-page-chart-slot">
            <SkeletonChartPanel />
          </div>
          <div className="token-page-tape-slot">
            <section className="panel-surface flex h-full min-h-0 flex-col">
              <div className="flex gap-2 border-b border-pump-border/15 px-3 py-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-14" />
              </div>
              <div className="flex-1 space-y-2 p-2">
                {Array.from({ length: 10 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            </section>
          </div>
        </div>

        <aside className="token-page-stack token-page-stack--aside hidden lg:flex">
          <SkeletonTradePanel />
        </aside>
      </div>
    </div>
  );
}
