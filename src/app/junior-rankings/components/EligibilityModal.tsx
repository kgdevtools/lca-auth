"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Trophy,
  Target,
  MapPin,
  Calendar,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  JuniorPlayerRanking,
  TournamentEntry,
  JuniorEligibility,
} from "../server-actions";

// Period definitions (same as tournaments)
const PERIODS = [
  {
    label: "1 Oct 2024 - 30 Sept 2025",
    value: "2024-2025",
    start: "2024-10-01",
    end: "2025-09-30",
  },
  {
    label: "1 Oct 2025 - 30 Sept 2026",
    value: "2025-2026",
    start: "2025-10-01",
    end: "2026-09-30",
  },
];

// Helper function to normalize date format to YYYY-MM-DD
function normalizeDate(date: string): string {
  return date.replace(/\//g, "-");
}

// Helper function to check if tournament date is in period
function isInPeriod(date: string | null, periodValue: string): boolean {
  if (!date) return false;

  const period = PERIODS.find((p) => p.value === periodValue);
  if (!period) return false;

  const normalizedDate = normalizeDate(date);
  return normalizedDate >= period.start && normalizedDate <= period.end;
}

// Helper function to filter tournaments by period
function filterTournamentsByPeriod(
  tournaments: TournamentEntry[],
  periodValue: string,
): TournamentEntry[] {
  if (!periodValue || periodValue === "ALL") {
    return tournaments;
  }
  return tournaments.filter((t) => isInPeriod(t.tournament_date, periodValue));
}

// Form indicator component
const StandingIndicator = ({ rank }: { rank: number }) => {
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const getStyles = () => {
    if (rank === 1)
      return "bg-yellow-500 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 border-yellow-600 dark:border-yellow-700";
    if (rank === 2)
      return "bg-gray-300 dark:bg-gray-500 text-gray-900 dark:text-gray-100 border-gray-400 dark:border-gray-600";
    if (rank === 3)
      return "bg-amber-700 dark:bg-amber-800 text-amber-50 dark:text-amber-100 border-amber-800 dark:border-amber-900";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div
      className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-sm border text-[10px] sm:text-xs font-black uppercase tracking-tighter ${getStyles()}`}
      title={`Finished ${getOrdinal(rank)}`}
    >
      {getOrdinal(rank)}
    </div>
  );
};

interface EligibilityModalProps {
  player: JuniorPlayerRanking | null;
  open: boolean;
  period: string;
  onClose: () => void;
}

export function EligibilityModal({
  player,
  open,
  period,
  onClose,
}: EligibilityModalProps) {
  if (!player) return null;

  const eligibility = player.cdc_eligibility;

  // Filter tournaments by period first
  const filteredByPeriod = filterTournamentsByPeriod(
    player.tournaments,
    period,
  );

  // Calculate tournaments actually played
  const playedTournaments = filteredByPeriod.filter((tournament) => {
    const tieBreaks = tournament.tie_breaks || {};
    const hasValidTieBreaks = Object.values(tieBreaks).some(
      (value) =>
        value !== null && value !== undefined && value !== "" && value !== 0,
    );
    return hasValidTieBreaks;
  });

  const tournamentsPlayedCount = playedTournaments.length;

  // Calculate average performance rating only from played tournaments in the period
  const validPerformanceRatings = playedTournaments
    .map((t) => t.performance_rating)
    .filter(
      (rating): rating is number => rating !== null && rating !== undefined,
    );

  const avgPerformanceRating =
    validPerformanceRatings.length > 0
      ? validPerformanceRatings.reduce((sum, rating) => sum + rating, 0) /
        validPerformanceRatings.length
      : null;

  const activePeriod = PERIODS.find((p) => p.value === period);
  const periodLabel = activePeriod ? activePeriod.label : "All Time";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        size="wide"
        className="max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-border bg-card"
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">
            <div className="flex items-center justify-between">
              <span>{player.display_name}</span>
              {eligibility?.eligible && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-sm px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  CDC Eligible
                </Badge>
              )}
            </div>
            <div className="text-lg font-normal text-muted-foreground mt-2">
              Junior Eligibility Details - {periodLabel}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Tournaments
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {eligibility?.totalTournaments || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total played</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">
                  Open Tournaments
                </span>
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {eligibility?.openTournamentsThatCount || 0}
              </div>
              <div className="text-xs text-muted-foreground">That count</div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Capricorn</span>
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {eligibility?.capricornOpenTournaments || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                District tournaments
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">APR</span>
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {avgPerformanceRating
                  ? Number(avgPerformanceRating).toFixed(1)
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                Average performance
              </div>
            </div>
          </div>

          {/* CDC Requirements */}
          <div className="bg-card border-2 border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              CDC Requirements Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Total Tournaments
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {eligibility?.totalTournaments || 0}/6
                    </span>
                    {(eligibility?.totalTournaments || 0) >= 6 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Open Tournaments
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {eligibility?.openTournamentsThatCount || 0}/2
                    </span>
                    {(eligibility?.openTournamentsThatCount || 0) >= 2 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Capricorn District
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">
                      {eligibility?.capricornOpenTournaments || 0}/1
                    </span>
                    {(eligibility?.capricornOpenTournaments || 0) >= 1 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Requirement Met</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={
                        eligibility?.eligible
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {eligibility?.requirement === "THREE_PLUS_THREE"
                        ? "3+3 Path"
                        : eligibility?.requirement === "SIX_TOTAL"
                          ? "6 Total Path"
                          : "None"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {eligibility?.warnings && eligibility.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-800">
                    Requirements to Meet:
                  </span>
                </div>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {eligibility.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recent Standings */}
          {eligibility?.recentRanks && eligibility.recentRanks.length > 0 && (
            <div className="bg-card border-2 border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
                Recent Standings (Last 5 Tournaments)
              </h3>
              <div className="flex items-center space-x-2">
                {eligibility.recentRanks.map((rank, i) => (
                  <StandingIndicator key={i} rank={rank} />
                ))}
              </div>
            </div>
          )}

          {/* Tournament Details */}
          <div className="bg-card border-2 border-border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Tournament Details</h3>
            <div className="h-full w-full overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-bold uppercase text-xs text-muted-foreground min-w-[200px]">
                      Tournament
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px]">
                      Date
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[60px]">
                      Type
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[60px]">
                      Rating
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[80px]">
                      Performance
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[60px]">
                      Standing
                    </TableHead>
                    <TableHead className="text-center font-bold uppercase text-xs text-muted-foreground w-[100px]">
                      CDC Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredByPeriod.map((t, idx) => {
                    const tieBreaks = t.tie_breaks || {};
                    const hasValidTieBreaks = Object.values(tieBreaks).some(
                      (value) =>
                        value !== null &&
                        value !== undefined &&
                        value !== "" &&
                        value !== 0,
                    );

                    return (
                      <TableRow
                        key={`${t.tournament_id}-${idx}`}
                        className={`hover:bg-muted/30 ${!hasValidTieBreaks ? "opacity-50" : ""}`}
                      >
                        <TableCell className="text-sm font-medium text-foreground min-w-[200px] break-words">
                          <div className="flex items-center space-x-2">
                            <span>{t.tournament_name}</span>
                            {t.cdc_classification?.is_capricorn_district && (
                              <div title="Capricorn District">
                                <MapPin className="h-3 w-3 text-orange-500" />
                              </div>
                            )}
                          </div>
                          {!hasValidTieBreaks && (
                            <span className="text-xs text-muted-foreground">
                              (Registered)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground w-[80px]">
                          {t.tournament_date ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground w-[60px]">
                          {t.cdc_classification ? (
                            <Badge variant="outline" className="text-xs">
                              {t.cdc_classification.classification_type ===
                              "JUNIOR_QUALIFYING"
                                ? "Junior"
                                : t.cdc_classification.classification_type ===
                                    "OPEN"
                                  ? "Open"
                                  : "Other"}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground w-[60px]">
                          {t.player_rating ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-center text-foreground w-[80px]">
                          {t.performance_rating ?? "-"}
                        </TableCell>
                        <TableCell className="text-center w-[60px]">
                          {hasValidTieBreaks && t.rank ? (
                            <StandingIndicator rank={t.rank} />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-center w-[100px]">
                          {t.cdc_classification?.meets_rating_requirement &&
                          t.cdc_classification?.classification_type ===
                            "OPEN" ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Counts
                            </Badge>
                          ) : t.cdc_classification?.classification_type ===
                            "OPEN" ? (
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-200 text-xs"
                            >
                              No Rating
                            </Badge>
                          ) : t.cdc_classification?.classification_type ===
                            "JUNIOR_QUALIFYING" ? (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-200 text-xs"
                            >
                              Qualifying
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
