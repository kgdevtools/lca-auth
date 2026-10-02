import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown the moment someone navigates to /rankings, while the server builds the
 * ranked pool (seconds on a cold cache). Mirrors the real layout — heading,
 * notice bar, filter bar, table — so nothing jumps when the data arrives.
 * Skeleton pulses are disabled under prefers-reduced-motion.
 */
const ROWS = 10

export default function RankingsLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="animate-in fade-in duration-200">
      <span className="sr-only">Loading rankings…</span>

      <header className="mx-auto max-w-[1200px] px-4 pt-6 xl:px-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Limpopo Chess Rankings
        </h1>
        <div className="mt-3 max-w-3xl space-y-2">
          <Skeleton className="bg-muted h-3.5 w-full rounded-sm motion-reduce:animate-none" />
          <Skeleton className="bg-muted h-3.5 w-4/5 rounded-sm motion-reduce:animate-none" />
        </div>
      </header>

      {/* "Can't find your name?" notice */}
      <div className="mx-auto mt-5 flex min-h-12 max-w-[1200px] items-center border border-amber-500/40 bg-amber-500/10 px-4">
        <Skeleton className="bg-muted h-3.5 w-40 rounded-sm bg-amber-500/25 motion-reduce:animate-none" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 xl:px-0">
        {/* search + filters + download */}
        <div className="flex gap-2">
          <Skeleton className="bg-muted h-10 flex-1 rounded-sm motion-reduce:animate-none" />
          <Skeleton className="bg-muted h-10 w-24 rounded-sm motion-reduce:animate-none" />
          <Skeleton className="bg-muted h-10 w-10 rounded-sm motion-reduce:animate-none" />
        </div>
        {/* scope chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[88, 120, 72].map((w) => (
            <Skeleton key={w} className="h-7 rounded-sm motion-reduce:animate-none" style={{ width: w }} />
          ))}
        </div>

        {/* table */}
        <div className="mt-5 border border-border">
          <div className="flex h-10 items-center gap-4 border-b border-border bg-muted/40 px-3">
            <Skeleton className="bg-muted h-3 w-6 rounded-sm motion-reduce:animate-none" />
            <Skeleton className="bg-muted h-3 w-32 rounded-sm motion-reduce:animate-none" />
            <Skeleton className="bg-muted ml-auto h-3 w-16 rounded-sm motion-reduce:animate-none" />
            <Skeleton className="bg-muted h-3 w-12 rounded-sm motion-reduce:animate-none" />
            <Skeleton className="bg-muted hidden h-3 w-12 rounded-sm sm:block motion-reduce:animate-none" />
          </div>
          {Array.from({ length: ROWS }, (_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-4 border-b border-border px-3 last:border-b-0"
              // Stagger the pulse so the table shimmers top-to-bottom.
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Skeleton className="bg-muted h-3.5 w-5 rounded-sm motion-reduce:animate-none" style={{ animationDelay: `${i * 60}ms` }} />
              <div className="space-y-1.5">
                <Skeleton className="bg-muted h-3.5 rounded-sm motion-reduce:animate-none" style={{ width: 110 + ((i * 37) % 70), animationDelay: `${i * 60}ms` }} />
                <Skeleton className="bg-muted h-2.5 w-14 rounded-sm motion-reduce:animate-none" style={{ animationDelay: `${i * 60}ms` }} />
              </div>
              <Skeleton className="bg-muted ml-auto h-4 w-12 rounded-sm bg-primary/15 motion-reduce:animate-none" style={{ animationDelay: `${i * 60}ms` }} />
              <Skeleton className="bg-muted h-3.5 w-10 rounded-sm motion-reduce:animate-none" style={{ animationDelay: `${i * 60}ms` }} />
              <Skeleton className="bg-muted hidden h-3.5 w-8 rounded-sm sm:block motion-reduce:animate-none" style={{ animationDelay: `${i * 60}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
