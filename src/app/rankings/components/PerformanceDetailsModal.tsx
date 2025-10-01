"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PlayerRanking } from "../server-actions"

function formatClassification(className: string): string {
  if (className === "RATING_RELATED") return "PERFORMANCE"
  return className.replaceAll("_", " ")
}

interface PerformanceDetailsModalProps {
  player: PlayerRanking | null
  open: boolean
  onClose: () => void
}

export function PerformanceDetailsModal({ player, open, onClose }: PerformanceDetailsModalProps) {
  if (!player) return null

  const tieBreakKeys = Array.from(new Set(player.tournaments.flatMap((t) => Object.keys(t.tie_breaks ?? {}))))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="wide" className="border-2 border-border bg-card text-card-foreground flex flex-col rounded-md">
        <DialogHeader className="flex-shrink-0 pb-3 px-2 sm:px-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <span className="text-foreground truncate">{player.display_name}</span>
            <span className="text-base sm:text-lg font-semibold text-muted-foreground whitespace-nowrap">
              Avg Performance: {player.avg_performance_rating ?? "-"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-2 sm:px-4 pb-4">
          <div className="h-full w-full overflow-x-auto overflow-y-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground min-w-[260px] w-[260px]">
                    Tournament
                  </TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[100px]">
                    Rating
                  </TableHead>
                  {tieBreakKeys.map((key) => (
                    <TableHead
                      key={key}
                      className="text-center font-bold uppercase text-xs text-muted-foreground w-[120px]"
                    >
                      {formatClassification(player.tournaments[0].classifications?.[key] ?? key)}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[120px]">
                    Performance
                  </TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[120px]">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {player.tournaments.map((t, idx) => (
                  <TableRow key={`${t.tournament_id}-${idx}`} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium text-foreground min-w-[260px] w-[260px] break-words leading-tight py-3">
                      {t.tournament_name}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground w-[100px]">
                      {t.player_rating}
                    </TableCell>
                    {tieBreakKeys.map((key) => (
                      <TableCell key={key} className="text-sm text-center text-muted-foreground w-[120px]">
                        {t.tie_breaks?.[key] ?? "-"}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm font-semibold text-center text-foreground w-[120px]">
                      {t.performance_rating ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground w-[120px]">
                      {t.confidence ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
