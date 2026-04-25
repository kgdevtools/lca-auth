import { Suspense } from 'react'
import ActivePlayersTableRefactored from './components/ActivePlayersTableRefactored'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Active Players | Admin Dashboard',
}

export default function ActivePlayersPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          Active Players
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          August 2025 tournament season with performance metrics
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-border/50">
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/3" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/6" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/6" />
              </div>
            ))}
          </div>
        }
      >
        <ActivePlayersTableRefactored />
      </Suspense>
    </div>
  )
}
