export default function Loading() {
  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8 mx-auto max-w-[90rem]">
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl xl:text-5xl tracking-tight">
          Tournaments
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Loading tournaments…</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse rounded-lg border border-border bg-card shadow-sm h-40 sm:h-48 lg:h-56 flex flex-col"
          >
            <div className="p-3 sm:p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}