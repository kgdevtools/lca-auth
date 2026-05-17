// src/app/admin/admin-dashboard/tournament-selection/page.tsx
import { Suspense } from "react"
import TournamentSelectionTable from "./TournamentSelectionTable"
import { getSelectionMeta, getDetectedTournaments } from "./actions"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tournament Selection | Admin Dashboard",
}

export default async function TournamentSelectionPage() {
  const [selectionMeta, detectedTournaments] = await Promise.all([
    getSelectionMeta(),
    getDetectedTournaments()
  ])
  
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          Tournament Selection
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          Manage which tournaments count for CDC Junior Selection criteria
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded-sm w-1/3" />
            <div className="h-64 bg-muted animate-pulse rounded-md" />
          </div>
        }
      >
        <TournamentSelectionTable 
          initialSelectionMeta={selectionMeta}
          detectedTournaments={detectedTournaments}
        />
      </Suspense>
    </div>
  )
}