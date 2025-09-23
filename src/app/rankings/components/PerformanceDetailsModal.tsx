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
      <DialogContent className="max-w-4xl border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex flex-col">
            <span className="text-foreground">{player.display_name}</span>
            <span className="text-lg font-semibold text-muted-foreground">
              Avg Performance: {player.avg_performance_rating ?? "-"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold uppercase text-xs text-muted-foreground">Tournament</TableHead>
                <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground">
                  Player Rating
                </TableHead>
                {tieBreakKeys.map((key) => (
                  <TableHead key={key} className="text-center font-bold uppercase text-xs text-muted-foreground">
                    {formatClassification(player.tournaments[0].classifications?.[key] ?? key)}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground">
                  Performance
                </TableHead>
                <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground">
                  Confidence
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {player.tournaments.map((t, idx) => (
                <TableRow key={`${t.tournament_id}-${idx}`} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-medium text-foreground">{t.tournament_name}</TableCell>
                  <TableCell className="text-sm text-center text-muted-foreground">{t.player_rating}</TableCell>
                  {tieBreakKeys.map((key) => (
                    <TableCell key={key} className="text-sm text-center text-muted-foreground">
                      {t.tie_breaks?.[key] ?? "-"}
                    </TableCell>
                  ))}
                  <TableCell className="text-sm font-semibold text-center text-foreground">
                    {t.performance_rating ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-center text-muted-foreground">{t.confidence ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
