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
      <DialogContent className="w-[95vw] max-w-[90rem] max-h-[90vh] border-2 border-border bg-card text-card-foreground overflow-hidden flex flex-col rounded-sm">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-bold flex flex-col space-y-1">
            <span className="text-foreground">{player.display_name}</span>
            <span className="text-lg font-semibold text-muted-foreground">
              Avg Performance: {player.avg_performance_rating ?? "-"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold uppercase text-xs text-muted-foreground min-w-[200px] sm:min-w-[250px] w-[200px] sm:w-[250px] bg-muted/50">
                    Tournament
                  </TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px] sm:w-[100px]">
                    Rating
                  </TableHead>
                  {tieBreakKeys.map((key) => (
                    <TableHead
                      key={key}
                      className="text-center font-bold uppercase text-xs text-muted-foreground w-[100px] sm:w-[120px]"
                    >
                      {formatClassification(player.tournaments[0].classifications?.[key] ?? key)}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px] sm:w-[100px]">
                    Performance
                  </TableHead>
                  <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px] sm:w-[100px]">
                    Confidence
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {player.tournaments.map((t, idx) => (
                  <TableRow key={`${t.tournament_id}-${idx}`} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium text-foreground min-w-[200px] sm:min-w-[250px] w-[200px] sm:w-[250px] bg-card break-words hyphens-auto leading-tight py-3">
                      {t.tournament_name}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground w-[80px] sm:w-[100px]">
                      {t.player_rating}
                    </TableCell>
                    {tieBreakKeys.map((key) => (
                      <TableCell key={key} className="text-sm text-center text-muted-foreground w-[100px] sm:w-[120px]">
                        {t.tie_breaks?.[key] ?? "-"}
                      </TableCell>
                    ))}
                    <TableCell className="text-sm font-semibold text-center text-foreground w-[80px] sm:w-[100px]">
                      {t.performance_rating ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground w-[80px] sm:w-[100px]">
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
