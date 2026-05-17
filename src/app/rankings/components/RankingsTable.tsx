"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PlayerRanking, TournamentEntry } from "../server-actions"

const PERIODS = [
  { label: '1 Oct 2024 - 30 Sept 2025', value: '2024-2025', start: '2024-10-01', end: '2025-09-30' },
  { label: '1 Oct 2025 - 30 Sept 2026', value: '2025-2026', start: '2025-10-01', end: '2026-09-30' },
]

function normalizeDate(date: string): string {
  return date.replace(/\//g, '-')
}

function isInPeriod(date: string | null, periodValue: string): boolean {
  if (!date) return false
  const period = PERIODS.find(p => p.value === periodValue)
  if (!period) return false
  return normalizeDate(date) >= period.start && normalizeDate(date) <= period.end
}

function getFilteredTournaments(tournaments: TournamentEntry[], periodValue: string): TournamentEntry[] {
  let filtered = tournaments
  if (periodValue && periodValue !== "ALL") {
    filtered = tournaments.filter(t => isInPeriod(t.tournament_date, periodValue))
  }
  return filtered.filter(t => {
    const tieBreaks = t.tie_breaks || {}
    return Object.values(tieBreaks).some(v => v !== null && v !== undefined && v !== "" && v !== 0)
  })
}

interface RankingsTableProps {
  data: PlayerRanking[]
  loading?: boolean
  period: string
  onSelectPlayer: (player: PlayerRanking) => void
}

function TableSkeleton() {
  return (
    <div className="rounded-md border-2 border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px] text-center">Rank</TableHead>
            <TableHead className="w-[25%]">Name</TableHead>
            <TableHead className="w-[8%] text-center">Gender</TableHead>
            <TableHead className="w-[10%] text-center">Age Group</TableHead>
            <TableHead className="w-[10%] text-center">Events</TableHead>
            <TableHead className="w-[10%] text-center">Fed</TableHead>
            <TableHead className="w-[15%] text-center">Rating</TableHead>
            <TableHead className="w-[22%] text-center">APR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <TableRow key={idx} className="hover:bg-transparent">
              <TableCell className="text-center">
                <div className="h-4 w-6 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-6 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-10 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-10 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function RankingsTable({ data, loading = false, period, onSelectPlayer }: RankingsTableProps) {
  if (loading) {
    return <TableSkeleton />
  }

  return (
    <div className="w-full">
      <div className="rounded-md border-2 border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
                <TableHead className="w-[50px] text-left font-semibold text-muted-foreground pl-4 bg-muted/50">Rank</TableHead>
                <TableHead className="w-[25%] font-semibold text-muted-foreground bg-muted/50">Name</TableHead>
                <TableHead className="w-[8%] text-center font-semibold text-muted-foreground bg-muted/50">Gender</TableHead>
                <TableHead className="w-[10%] text-center font-semibold text-muted-foreground bg-muted/50">Age Group</TableHead>
                <TableHead className="w-[10%] text-center font-semibold text-muted-foreground bg-muted/50">No of Events</TableHead>
                <TableHead className="w-[10%] text-center font-semibold text-muted-foreground bg-muted/50">Fed</TableHead>
                <TableHead className="w-[15%] text-center font-semibold text-muted-foreground bg-muted/50">Rating</TableHead>
                <TableHead className="w-[22%] text-left font-semibold text-muted-foreground pl-0 bg-muted/50">APR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No players found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                data.map((player, idx) => {
                  const sex = String(player.sex ?? '').toUpperCase()
                  const displaySex = sex.startsWith('M') ? 'M' : sex.startsWith('F') ? 'F' : '-'
                  const filteredTournaments = getFilteredTournaments(player.tournaments, period)
                  const validPerformanceRatings = filteredTournaments.map(t => t.performance_rating).filter((r): r is number => r !== null && r !== undefined)
                  const avgPerformanceRating = validPerformanceRatings.length > 0 ? validPerformanceRatings.reduce((s, r) => s + r, 0) / validPerformanceRatings.length : null
                  const tournamentsCount = filteredTournaments.length

                  return (
                    <TableRow key={player.name_key} className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm font-medium text-left text-foreground pl-4">{idx + 1}</TableCell>
                      <TableCell className="pr-2">
                        <button
                          onClick={() => onSelectPlayer(player)}
                          className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-colors text-left flex items-center gap-1"
                        >
                          <span className="truncate">{player.display_name}</span>
                          {player.is_junior && player.selection_stats.meetsCriteria && (
                            <span className="text-[10px] font-bold text-red-600 italic">Q</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {displaySex}
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm text-center",
                        player.is_junior ? "font-semibold text-amber-600" : "text-muted-foreground"
                      )}>
                        {player.age_group ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5" title="Tournaments played">
                          {tournamentsCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {player.fed ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {player.rating ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm font-bold text-amber-600 pl-0">
                        {avgPerformanceRating ? Number(avgPerformanceRating).toFixed(1) : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}