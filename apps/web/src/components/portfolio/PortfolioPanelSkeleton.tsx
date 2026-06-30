import { Skeleton } from "@/components/ui/Skeleton";

export function PortfolioPanelSkeleton() {
  return (
    <div className="portfolio-hub" aria-busy="true" aria-label="Loading portfolio">
      <section className="portfolio-hub-hero panel-surface">
        <div className="portfolio-hub-hero__head">
          <div className="portfolio-hub-hero__value-block space-y-2">
            <Skeleton variant="line" className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton variant="line" className="h-3 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton variant="line" className="ml-auto h-3 w-20" />
            <Skeleton variant="line" className="ml-auto h-3 w-28" />
          </div>
        </div>

        <div className="portfolio-hub-hero__stats">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-1 px-2 py-2">
              <Skeleton variant="line" className="h-3 w-14" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>

        <div className="portfolio-hub-hero__actions">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </section>

      <div className="portfolio-tab-nav segment-control">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 flex-1 rounded-none" />
        ))}
      </div>

      <section className="panel-surface overflow-hidden">
        <div className="sheet-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.75rem_1fr_auto] gap-x-2 gap-y-2 p-2.5 md:p-3"
            >
              <Skeleton variant="circle" className="row-span-2 h-7 w-7 self-start" />
              <Skeleton className="h-4 w-20 self-center" />
              <Skeleton variant="line" className="h-4 w-14 self-center" />
              <div className="col-span-2 col-start-2 flex justify-between gap-2">
                <Skeleton variant="line" className="h-3 w-16" />
                <Skeleton variant="line" className="h-3 w-14" />
                <Skeleton variant="line" className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
