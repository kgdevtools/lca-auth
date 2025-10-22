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

  // Always display TB1-TB6 columns
  const allTieBreakColumns = ['TB1', 'TB2', 'TB3', 'TB4', 'TB5', 'TB6']

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
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px]">
                    Rating
                  </TableHead>
                  {allTieBreakColumns.map((tbKey) => (
                    <TableHead
                      key={tbKey}
                      className="text-center font-bold uppercase text-xs text-muted-foreground w-[70px]"
                    >
                      {tbKey}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[100px]">
                    Performance
                  </TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[100px]">
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
                    <TableCell className="text-sm text-center text-muted-foreground w-[80px]">
                      {t.player_rating ?? "-"}
                    </TableCell>
                    {allTieBreakColumns.map((tbKey) => {
                      const value = t.tie_breaks?.[tbKey]
                      const hasValue = value !== undefined && value !== null && value !== ""
                      return (
                        <TableCell 
                          key={tbKey} 
                          className={`text-sm text-center w-[70px] ${
                            hasValue 
                              ? "text-foreground font-medium" 
                              : "text-muted-foreground/40 italic"
                          }`}
                        >
                          {hasValue ? value : "-"}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-sm font-semibold text-center text-foreground w-[100px]">
                      {t.performance_rating ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground w-[100px]">
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
