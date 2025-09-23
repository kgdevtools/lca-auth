"use client"

import * as React from "react"
import { getRankings, getTournamentOptions, type PlayerRanking, type RankingFilters } from "./server-actions"
import { RankingsTable } from "./components/RankingsTable"
import { PerformanceDetailsModal } from "./components/PerformanceDetailsModal"
import { SearchFilters } from "./components/SearchFilters"

export default function RankingsPage() {
  const [data, setData] = React.useState<Array<PlayerRanking>>([])
  const [selected, setSelected] = React.useState<PlayerRanking | null>(null)
  const [open, setOpen] = React.useState(false)
  const [tournaments, setTournaments] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    Promise.all([getRankings({}), getTournamentOptions()])
      .then(([rows, opts]) => {
        setData(rows)
        setTournaments(opts)
      })
      .catch((err) => console.error("Error fetching data", err))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (filters: RankingFilters) => {
    setLoading(true)
    getRankings(filters)
      .then((rows) => setData(rows))
      .catch((err) => console.error("Error fetching rankings", err))
      .finally(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Player Rankings</h1>
            <p className="text-muted-foreground">View player performance rankings and statistics</p>
          </div>

          <SearchFilters onSearch={handleSearch} tournamentOptions={tournaments} />

          <RankingsTable
            data={data}
            loading={loading}
            onSelectPlayer={(p) => {
              setSelected(p)
              setOpen(true)
            }}
          />

          <PerformanceDetailsModal player={selected} open={open} onClose={() => setOpen(false)} />
        </div>
      </div>
    </div>
  )
}
