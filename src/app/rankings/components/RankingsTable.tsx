"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { PlayerRanking } from "../server-actions"

interface RankingsTableProps {
  data: PlayerRanking[]
  loading?: boolean
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
            <TableHead className="w-[22%] text-center">Average Performance Rating</TableHead>
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

export function RankingsTable({ data, loading = false, onSelectPlayer }: RankingsTableProps) {
  if (loading) {
    return <TableSkeleton />
  }

  return (
    <div className="w-full">
      <div className="rounded-md border-2 border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px] text-left font-semibold text-muted-foreground pl-4">Rank</TableHead>
              <TableHead className="w-[25%] font-semibold text-muted-foreground">Name</TableHead>
              <TableHead className="w-[8%] text-center font-semibold text-muted-foreground">Gender</TableHead>
              <TableHead className="w-[10%] text-center font-semibold text-muted-foreground">Age Group</TableHead>
              <TableHead className="w-[10%] text-center font-semibold text-muted-foreground">No of Events</TableHead>
              <TableHead className="w-[10%] text-center font-semibold text-muted-foreground">Fed</TableHead>
              <TableHead className="w-[15%] text-center font-semibold text-muted-foreground">Rating</TableHead>
              <TableHead className="w-[22%] text-left font-semibold text-muted-foreground pl-0">
                <div className="text-balance">APR</div>
              </TableHead>
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
                const sex = String(player.sex ?? '').toUpperCase();
                const displaySex = sex.startsWith('M') ? 'M' : sex.startsWith('F') ? 'F' : '-';
                
                // Calculate average performance rating only from played tournaments
                const playedTournaments = player.tournaments.filter(tournament => {
                  const tieBreaks = tournament.tie_breaks || {}
                  const hasValidTieBreaks = Object.values(tieBreaks).some(value => 
                    value !== null && value !== undefined && value !== "" && value !== 0
                  )
                  return hasValidTieBreaks && tournament.performance_rating
                })
                
                const validPerformanceRatings = playedTournaments
                  .map(t => t.performance_rating)
                  .filter((rating): rating is number => rating !== null && rating !== undefined)
                
                const avgPerformanceRating = validPerformanceRatings.length > 0 
                  ? validPerformanceRatings.reduce((sum, rating) => sum + rating, 0) / validPerformanceRatings.length
                  : null

                return (
                  <TableRow key={player.name_key} className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium text-left text-foreground pl-4">{idx + 1}</TableCell>
                    <TableCell className="pr-2">
                      <button
                        onClick={() => onSelectPlayer(player)}
                        className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-colors text-left truncate"
                      >
                        {player.display_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">
                      {displaySex}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">
                      {player.age_group ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5" title="Tournaments played">
                        {player.tournaments_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">
                      {player.fed ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">
                      {player.rating ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-left text-foreground pl-0">
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
  )
}