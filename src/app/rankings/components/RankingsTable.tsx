"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
            <TableHead className="w-[60px] text-center">Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Player Rating</TableHead>
            <TableHead className="text-center">Avg Performance</TableHead>
            <TableHead className="text-center">Events</TableHead>
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
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-12 bg-muted animate-pulse rounded mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" />
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[60px] text-center font-semibold text-muted-foreground">Rank</TableHead>
                <TableHead className="font-semibold text-muted-foreground min-w-[150px]">Name</TableHead>
                <TableHead className="text-center font-semibold text-muted-foreground min-w-[120px]">
                  Player Rating
                </TableHead>
                <TableHead className="text-center font-semibold text-muted-foreground min-w-[140px]">
                  Avg Performance
                </TableHead>
                <TableHead className="text-center font-semibold text-muted-foreground min-w-[80px]">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No players found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                data.map((player, idx) => {
                  const latestTournament = player.tournaments[0]
                  return (
                    <TableRow key={player.name_key} className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm font-medium text-center text-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => onSelectPlayer(player)}
                          className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-colors text-left"
                        >
                          {player.display_name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {latestTournament?.player_rating ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-center text-foreground">
                        {player.avg_performance_rating ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground">
                        {player.tournaments.length}
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
