// src/app/admin/admin-dashboard/tournaments/page.tsx
import { Suspense } from "react"
import TournamentsTable from "./TournamentsTable"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tournaments | Admin Dashboard",
}

export default function TournamentsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          Tournaments
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          Records from October 2024 – September 2025
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-border/50">
                <div className="h-4 bg-muted animate-pulse rounded-sm w-2/5" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/5" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/5" />
              </div>
            ))}
          </div>
        }
      >
        <TournamentsTable />
      </Suspense>
    </div>
  )
}
