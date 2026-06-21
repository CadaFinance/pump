import { Skeleton } from "@/components/ui/Skeleton";

export function SkeletonPageIntro() {
  return (
    <div className="page-intro" aria-hidden>
      <Skeleton variant="line" className="h-3 w-20" />
      <Skeleton className="mt-1 h-7 w-36 max-w-[70%]" />
      <Skeleton variant="line" className="mt-1 h-4 w-full max-w-md" />
    </div>
  );
}

export function SkeletonMcapTicker() {
  return (
    <div className="panel-surface overflow-hidden px-2 py-2 md:px-2.5 md:py-2.5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton variant="line" className="h-3 w-14 shrink-0" />
        <div className="flex min-w-0 flex-1 gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex shrink-0 items-center gap-2">
              <Skeleton variant="circle" className="h-[18px] w-[18px]" />
              <Skeleton variant="line" className="h-3 w-10" />
              <Skeleton variant="line" className="h-3 w-9" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonKothBanner() {
  return (
    <section className="koth-section space-y-2 md:space-y-3" aria-hidden>
      <Skeleton variant="line" className="h-3 w-28" />
      <div className="koth-banner panel-surface">
        <div className="koth-banner__inner p-3 md:p-4">
          <Skeleton variant="circle" className="h-12 w-12 shrink-0 md:h-[60px] md:w-[60px]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-5 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton variant="line" className="h-3 w-7" />
                <Skeleton className="h-5 w-20" />
                <Skeleton variant="line" className="h-4 w-12" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} variant="line" className="h-3 w-[4.5rem]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SkeletonHighlightCards({ count = 3 }: { count?: number }) {
  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="panel-surface flex min-w-0 flex-row flex-nowrap items-center justify-between gap-3 p-2.5 md:px-3 md:py-3"
        >
          <Skeleton variant="line" className="h-3 w-20" />
          <div className="flex shrink-0 items-center gap-1.5">
            <Skeleton variant="circle" className="h-[22px] w-[22px]" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </section>
  );
}

export function SkeletonArenaFilterChips({ count = 6 }: { count?: number }) {
  return (
    <div className="arena-filter-bar-wrap" aria-hidden>
      <div className="arena-filter-bar">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-[5.25rem] shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonArenaToolbar({ withViewToggle = true }: { withViewToggle?: boolean }) {
  return (
    <div className="arena-toolbar" aria-hidden>
      <div className="arena-search-group">
        <Skeleton className="arena-toolbar-search h-9 w-full min-w-0 rounded-md" />
        {withViewToggle ? (
          <div className="arena-search-end hidden gap-1 sm:flex">
            <Skeleton className="h-9 w-[4.75rem] rounded-md" />
            <Skeleton className="h-9 w-[4.75rem] rounded-md" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SkeletonBoardRow() {
  return (
    <div className="arena-explore-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3">
      <Skeleton variant="circle" className="h-10 w-10" />
      <div className="min-w-0 space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton variant="line" className="h-3 w-24" />
      </div>
      <div className="space-y-1 text-right">
        <Skeleton className="ml-auto h-4 w-16" />
        <Skeleton variant="line" className="ml-auto h-3 w-14" />
      </div>
    </div>
  );
}

export function SkeletonBoardTable({ rows = 8 }: { rows?: number }) {
  return (
    <section className="arena-explore-board overflow-hidden" aria-hidden>
      <div className="arena-explore-list lg:hidden">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonBoardRow key={index} />
        ))}
      </div>
      <div className="hidden lg:block overflow-x-auto">
        <div className="sheet-list border-0 rounded-none bg-transparent">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonBoardRow key={`desktop-${index}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SkeletonSegmentControl({ count = 4 }: { count?: number }) {
  return (
    <div className="segment-control inline-flex" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-14 rounded-md" />
      ))}
    </div>
  );
}

export function SkeletonChartPanel() {
  return (
    <section className="panel-surface overflow-hidden" aria-hidden>
      <div className="px-4 py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton variant="line" className="h-3 w-10" />
          <SkeletonSegmentControl count={2} />
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton variant="line" className="h-3 w-20" />
        </div>
      </div>
      <div className="border-t border-pump-border/10 px-3 py-2.5">
        <SkeletonSegmentControl count={6} />
      </div>
      <div className="border-t border-pump-border/10 px-3 py-2">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="line" className="h-3 w-14" />
          ))}
        </div>
      </div>
      <Skeleton className="h-[280px] w-full rounded-none md:h-[400px] lg:h-[460px]" />
    </section>
  );
}

export function SkeletonTradePanel() {
  return (
    <div className="panel-surface overflow-hidden" aria-hidden>
      <div className="sheet-tabs grid grid-cols-2 border-b border-pump-border/15">
        <Skeleton className="h-11 rounded-none" />
        <Skeleton className="h-11 rounded-none" />
      </div>
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
