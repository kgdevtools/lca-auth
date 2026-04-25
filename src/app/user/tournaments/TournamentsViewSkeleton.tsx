export default function TournamentsViewSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="pb-5 border-b border-border">
          <div className="h-8 w-36 bg-muted animate-pulse rounded-sm" />
          <div className="h-3 w-40 bg-muted animate-pulse rounded-sm mt-2" />
        </div>

        {/* Stats strip */}
        <div className="py-4 border-b border-border flex items-center gap-5">
          {[32, 24, 28, 24].map((w, i) => (
            <div key={i}>
              <div className={`h-5 w-${w} bg-muted animate-pulse rounded-sm`} />
              <div className="h-2.5 w-16 bg-muted animate-pulse rounded-sm mt-1.5" />
            </div>
          ))}
        </div>

        {/* Tournament history rows */}
        <div className="py-5 border-b border-border">
          <div className="h-2.5 w-32 bg-muted animate-pulse rounded-sm mb-4" />
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-4 bg-muted animate-pulse rounded-sm w-2/3" />
                <div className="h-3 bg-muted animate-pulse rounded-sm w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Games rows */}
        <div className="py-5">
          <div className="h-2.5 w-16 bg-muted animate-pulse rounded-sm mb-4" />
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-2 space-y-1">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted animate-pulse rounded-sm w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded-sm w-10" />
                </div>
                <div className="h-3 bg-muted animate-pulse rounded-sm w-1/2" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
