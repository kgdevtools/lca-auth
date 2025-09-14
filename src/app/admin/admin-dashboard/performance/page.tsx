import { Suspense } from 'react'
import PerformanceStatsSummary from './components/PerformanceStatsSummary'
import PlayersPerformanceTable from './components/PlayersPerformanceTable'
import { Skeleton } from '@/components/ui/skeleton'

export default function PerformancePage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Analyze player performance metrics and statistics
        </p>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      }>
        <PerformanceStatsSummary />
      </Suspense>

      <Suspense fallback={
        <div className="border rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      }>
        <PlayersPerformanceTable />
      </Suspense>
    </div>
  )
}
