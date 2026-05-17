"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Award } from "lucide-react"
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
  const normalizedDate = normalizeDate(date)
  return normalizedDate >= period.start && normalizedDate <= period.end
}

function filterTournamentsByPeriod(tournaments: TournamentEntry[], periodValue: string): TournamentEntry[] {
  if (!periodValue || periodValue === "ALL") {
    return tournaments
  }
  return tournaments.filter(t => isInPeriod(t.tournament_date, periodValue))
}

function getTournamentType(t: TournamentEntry): 'open' | 'junior' | 'other' {
  const type = t.tournament_type?.toLowerCase() ?? ''
  if (type.includes('junior')) return 'junior'
  if (type.includes('team')) return 'other'
  return 'open'
}

const limpopoKeywords = [
  'tzaneen', 'polokwane', 'northern academy', 'mokopane', 'limpopo',
  'modimolle', 'mookgopong', 'seshego', 'capricorn', 'vhembe',
  'mopane', 'sekhukhune', 'hans strijdom', 'bela-bela', 'tshakhuma',
  'turfloop', 'university of limp', 'capricorn tvet', 'flora park', 'waterberg'
]

const juniorQualifyingKeywords = [
  "cdc junior qualifiers", "cdc junior qualifying", "cdc qualifiers",
  "capricorn junior qualifying", "capricorn district chess",
  "vhembe district chess junior", "vhembe district junior",
  "mopani open junior", "mopani district junior qualifiers", "mopani open junior qualifying",
  "sekhukhune junior qualifying", "sekhukhune junior qualifiers",
  "vhembe district junior qualifier", "waterberg junior"
]

function isLimpopoTournament(t: TournamentEntry): boolean {
  const name = t.tournament_name?.toLowerCase() ?? ''
  const loc = t.location?.toLowerCase() ?? ''
  return limpopoKeywords.some(kw => name.includes(kw) || loc.includes(kw))
}

function isJuniorQualifyingTournament(t: TournamentEntry): boolean {
  const name = t.tournament_name?.toLowerCase() ?? ''
  return juniorQualifyingKeywords.some(kw => name.includes(kw))
}

function meetsJuniorSelectionCriteria(t: TournamentEntry): boolean {
  if (isJuniorQualifyingTournament(t)) return true
  const type = getTournamentType(t)
  if (type === 'open' && isLimpopoTournament(t)) return true
  return false
}

interface PerformanceDetailsModalProps {
  player: PlayerRanking | null
  open: boolean
  period: string
  onClose: () => void
}

export function PerformanceDetailsModal({ player, open, period, onClose }: PerformanceDetailsModalProps) {
  if (!player) return null

  const filteredByPeriod = filterTournamentsByPeriod(player.tournaments, period)

  const playedTournaments = filteredByPeriod.filter(t => {
    const tieBreaks = t.tie_breaks || {}
    return Object.values(tieBreaks).some(v => v !== null && v !== undefined && v !== '' && v !== 0)
  })

  const tournamentsPlayedCount = playedTournaments.length
  const validPerformanceRatings = playedTournaments.map(t => t.performance_rating).filter((r): r is number => r !== null && r !== undefined)
  const avgPerformanceRating = validPerformanceRatings.length > 0 ? validPerformanceRatings.reduce((s, r) => s + r, 0) / validPerformanceRatings.length : null

  const activePeriod = PERIODS.find(p => p.value === period)
  const periodLabel = activePeriod ? activePeriod.label : 'All Time'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        size="wide" 
        className="border-2 border-border bg-card text-card-foreground flex flex-col rounded-md max-h-[90vh] !max-w-[98vw] p-0"
      >
        <DialogHeader className="flex-shrink-0 px-3 py-2 sm:px-4 sm:py-3 border-b border-border">
          <DialogTitle className="text-base sm:text-lg font-bold flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-foreground truncate">{player.display_name}</span>
              {player.is_junior && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                  Junior
                </Badge>
              )}
              <span className="text-sm font-bold text-amber-600">APR: {avgPerformanceRating ? Number(avgPerformanceRating).toFixed(1) : "-"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
              <span>Period: <span className="text-primary">{periodLabel}</span></span>
              <span>Events: {tournamentsPlayedCount}</span>
              {player.is_junior && (
                <span>
                  {player.selection_stats.meetsCriteria ? (
                    <span className="text-red-600 font-bold">✓ QUALIFIED</span>
                  ) : (
                    <span className="text-muted-foreground">Not Qualified</span>
                  )}
                </span>
              )}
            </div>
            {player.is_junior && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-500" /> Counts for CDC Selection
                </span>
                <span className="flex items-center gap-1 font-bold text-red-600">
                  Q Meets Qualification Criteria
                </span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-2 sm:px-3 pb-2">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground">Event</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-20">Date</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-16 hidden md:table-cell">Rate</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-12 hidden lg:table-cell">TB1</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-12 hidden lg:table-cell">TB2</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-12 hidden lg:table-cell">TB3</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-muted-foreground text-center w-20">Perf</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredByPeriod.map((t, idx) => {
                const tieBreaks = t.tie_breaks || {}
                const hasValidTieBreaks = Object.values(tieBreaks).some(value =>
                  value !== null && value !== undefined && value !== "" && value !== 0
                )
                const meetsSelection = player.is_junior && meetsJuniorSelectionCriteria(t)

                return (
                  <TableRow 
                    key={`${t.tournament_id}-${idx}`} 
                    className={cn(
                      "hover:bg-muted/30",
                      !hasValidTieBreaks && "opacity-50"
                    )}
                  >
                    <TableCell className="text-xs sm:text-sm font-medium text-foreground py-2 align-top">
                      <div className="flex items-start gap-1.5">
                        <span className="whitespace-normal break-words">{t.tournament_name}</span>
                        {meetsSelection && (
                          <Award className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      {!hasValidTieBreaks && (
                        <span className="text-[10px] text-muted-foreground ml-1">(Reg)</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm text-center py-2 align-top", meetsSelection ? "text-amber-700" : "text-muted-foreground")}>
                      {t.tournament_date ?? "-"}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm text-center py-2 align-top hidden md:table-cell", meetsSelection ? "text-amber-700" : "text-muted-foreground")}>
                      {t.player_rating ?? "-"}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm text-center py-2 align-top hidden lg:table-cell", hasValidTieBreaks ? (meetsSelection ? "text-amber-700 font-medium" : "text-foreground font-medium") : "text-muted-foreground/40 italic")}>
                      {tieBreaks['TB1'] ?? "-"}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm text-center py-2 align-top hidden lg:table-cell", hasValidTieBreaks ? (meetsSelection ? "text-amber-700 font-medium" : "text-foreground font-medium") : "text-muted-foreground/40 italic")}>
                      {tieBreaks['TB2'] ?? "-"}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm text-center py-2 align-top hidden lg:table-cell", hasValidTieBreaks ? (meetsSelection ? "text-amber-700 font-medium" : "text-foreground font-medium") : "text-muted-foreground/40 italic")}>
                      {tieBreaks['TB3'] ?? "-"}
                    </TableCell>
                    <TableCell className={cn("text-xs sm:text-sm font-bold text-center py-2 align-top", meetsSelection ? "text-amber-700" : "text-foreground")}>
                      {t.performance_rating ?? "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}