import { Suspense } from "react"
import PlayersTable from "./components/PlayersTable"
import { WarningBanner } from "@/components/warning-banner"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Players",
  description: "Explore Limpopo Chess Academy players and performance history.",
}

export default async function PlayersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="space-y-6">
          <WarningBanner message="Development is still underway. Certain tournaments are missing performance calculations. Our developers are hard at work to include those. You may notice players have X tournaments listed but have Y performances calculated - this discrepancy will be resolved as we complete the performance calculation for all tournaments." />

          <div className="pb-4 border-b border-border">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                <span className="text-primary font-bold">Limpopo</span>{" "}
                <span className="text-muted-foreground">Chess Academy's</span> Players Database
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                Browse all players and their tournament performance history.
              </p>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-border border-t-primary"></div>
                <span className="ml-3 text-sm text-muted-foreground">Loading players...</span>
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
