import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Prerender-safe fallback while RootProviders awaits headers().
 * Must not use AppShell or other hooks (usePathname) — cacheComponents
 * evaluates this during static page generation.
 */
export function RootLoadingShell() {
  return (
    <div className="flex min-h-screen flex-col bg-pump-bg text-pump-text">
      <header className="app-header" aria-hidden>
        <div className="app-header-inner mx-auto w-full max-w-[1600px] px-4 md:px-6">
          <div className="flex h-14 items-center gap-3">
            <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
            <Skeleton variant="line" className="h-5 w-20" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-8">
        <div className="min-w-0 space-y-4" aria-busy="true" aria-label="Loading application">
          <Skeleton variant="line" className="h-6 w-40" />
          <Skeleton variant="block" className="h-48 w-full" />
          <Skeleton variant="block" className="h-32 w-full" />
        </div>
      </main>
    </div>
  );
}
