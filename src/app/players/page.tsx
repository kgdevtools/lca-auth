import { Suspense } from 'react'
import PlayersTable from './components/PlayersTable'
import { WarningBanner } from '@/components/warning-banner'

export default async function PlayersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        <div className="space-y-6">
          <WarningBanner message="Development is still underway. Certain tournaments are missing performance calculations. Our developers are hard at work to include those. You may notice players have X tournaments listed but have Y performances calculated - this discrepancy will be resolved as we complete the performance calculation for all tournaments." />
          
          {/* Header */}
          <div className="pb-6 border-b border-border">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              <span className="text-primary font-extrabold tracking-tightest">Limpopo</span> <span className="text-muted-foreground">Chess Academy's</span> Chess Players Database
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Browse all players and their tournament performance history.
            </p>
          </div>

          {/* Players Table */}
          <Suspense 
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading players...</span>
              </div>
            }
          >
            <PlayersTable />
          </Suspense>
        </div>
      </div>
    </div>
  )
}