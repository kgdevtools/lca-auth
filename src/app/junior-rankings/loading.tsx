export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-6">
        <div className="space-y-6">
          <div className="space-y-2 px-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-96 bg-muted animate-pulse rounded"></div>
          </div>

          <div className="px-4">
            <div className="h-16 w-full bg-muted animate-pulse rounded-lg"></div>
          </div>

          <div className="px-4">
            <div className="rounded-md border-2 border-border bg-card overflow-hidden">
              <div className="space-y-1">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="flex items-center space-x-4 p-3 border-b border-border">
                    <div className="w-8 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-8 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-10 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-8 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="w-12 h-4 bg-muted animate-pulse rounded"></div>
                    <div className="flex space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-5 h-5 bg-muted animate-pulse rounded-full"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}