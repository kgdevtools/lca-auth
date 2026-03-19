"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trophy } from "lucide-react";
import type { JuniorPlayerRanking, TournamentEntry } from "../server-actions";

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

function normalizeDate(date: string): string {
  return date.replace(/\//g, "-");
}

function isInPeriod(date: string | null, periodValue: string): boolean {
  if (!date) return false;
  const period = PERIODS.find((p) => p.value === periodValue);
  if (!period) return false;
  const normalizedDate = normalizeDate(date);
  return normalizedDate >= period.start && normalizedDate <= period.end;
}

function getFilteredTournaments(
  tournaments: TournamentEntry[],
  periodValue: string,
): TournamentEntry[] {
  let filtered = tournaments;
  if (periodValue && periodValue !== "ALL") {
    filtered = tournaments.filter((t) =>
      isInPeriod(t.tournament_date, periodValue),
    );
  }
  return filtered.filter((tournament) => {
    const tieBreaks = tournament.tie_breaks || {};
    const hasValidTieBreaks = Object.values(tieBreaks).some(
      (value) =>
        value !== null && value !== undefined && value !== "" && value !== 0,
    );
    return hasValidTieBreaks && tournament.performance_rating;
  });
}

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

interface JuniorRankingsTableProps {
  data: JuniorPlayerRanking[];
  loading?: boolean;
  period: string;
  onSelectPlayer: (player: JuniorPlayerRanking) => void;
}

export function JuniorRankingsTable({
  data,
  loading = false,
  period,
  onSelectPlayer,
}: JuniorRankingsTableProps) {
  if (loading)
    return (
      <div className="p-8 text-center animate-pulse font-sans">
        Loading Rankings...
      </div>
    );

  return (
    <div className="w-full">
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-auto max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-320px)] lg:max-h-[calc(100vh-360px)] 2xl:max-h-[calc(100vh-400px)] 4xl:max-h-[calc(100vh-440px)] 5xl:max-h-[calc(100vh-480px)] 6xl:max-h-[calc(100vh-520px)]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 dark:bg-muted/90 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="w-[80px] sm:w-[100px] text-left font-bold text-xs uppercase pl-4 py-3 sm:py-4">
                  Rank
                </TableHead>
                <TableHead className="font-bold text-xs uppercase py-3 sm:py-4">
                  Player Name
                </TableHead>
                <TableHead className="text-center font-bold text-xs uppercase py-3 sm:py-4">
                  QF Status
                </TableHead>
                <TableHead className="text-center font-bold text-xs uppercase py-3 sm:py-4">
                  Events
                </TableHead>
                <TableHead className="text-center font-bold text-xs uppercase py-3 sm:py-4">
                  APR
                </TableHead>
                <TableHead className="text-center font-bold text-xs uppercase pr-4 py-3 sm:py-4">
                  Recent Standings
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <span className="text-muted-foreground">
                      No players found for this period.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((player, idx) => {
                  const filteredTournaments = getFilteredTournaments(
                    player.tournaments,
                    period,
                  );
                  const validRatings = filteredTournaments
                    .map((t) => t.performance_rating)
                    .filter((r): r is number => r !== null && r !== undefined);

                  const avgRating =
                    validRatings.length > 0
                      ? (
                          validRatings.reduce((a, b) => a + b, 0) /
                          validRatings.length
                        ).toFixed(1)
                      : "-";

                  const isEligible = player.cdc_eligibility?.eligible === true;

                  // FIX: Ensure t.rank is recognized. Using filter(Boolean) to ignore null/0
                  const recentRanks = filteredTournaments
                    .slice(-5)
                    .map((t) => t.rank)
                    .filter((r): r is number => !!r);

                  return (
                    <TableRow
                      key={player.name_key}
                      className={`cursor-pointer hover:bg-accent/30 dark:hover:bg-accent/20 transition-colors ${
                        !isEligible ? "opacity-70 dark:opacity-60" : ""
                      }`}
                      onClick={() => onSelectPlayer(player)}
                    >
                      <TableCell className="pl-4 py-4 sm:py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg sm:text-xl tabular-nums">
                            {idx + 1}
                          </span>
                          {idx < 3 && isEligible && (
                            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 sm:py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-base sm:text-lg leading-none mb-1">
                            {player.display_name}
                          </span>
                          <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground tracking-tighter">
                            {player.fed ?? "RSA"} • {player.age_group ?? "U/O"}{" "}
                            • Rating: {player.rating ?? "0"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center py-4 sm:py-5">
                        <Badge
                          variant={isEligible ? "default" : "outline"}
                          className={
                            isEligible
                              ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
                              : "text-red-500 border-red-200 dark:text-red-400 dark:border-red-700"
                          }
                        >
                          {isEligible ? "Eligible" : "Ineligible"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-black text-xl sm:text-2xl text-foreground tabular-nums py-4 sm:py-5">
                        {filteredTournaments.length}
                      </TableCell>

                      <TableCell className="text-center font-black text-xl sm:text-2xl text-foreground tabular-nums py-4 sm:py-5">
                        {avgRating}
                      </TableCell>

                      <TableCell className="pr-4 py-4 sm:py-5">
                        <div className="flex items-center justify-center gap-1">
                          {recentRanks.length > 0 ? (
                            recentRanks.map((r, i) => (
                              <StandingIndicator key={i} rank={r} />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
