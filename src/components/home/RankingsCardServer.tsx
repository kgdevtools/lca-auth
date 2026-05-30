import { getSummaries } from "@/lib/rankingsServer";
import type { RankedSummary } from "@/lib/rankings";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Chess-season start year for the card: 2025 = Oct 2025–Sep 2026.
const SEASON = 2025;
const SEASON_LABEL = "2025–2026";
const REF_YEAR = 2026;

// Limpopo grouping — any of the local-union federation codes.
const LIM_CODES = new Set(["LCP", "LMG", "LSG", "LVT", "CSA", "LWT", "LIM"]);
const isLimpopo = (p: RankedSummary) =>
  p.federations.some((c) => LIM_CODES.has(c.toUpperCase()));
const ageOf = (p: RankedSummary) =>
  p.birthYear != null ? REF_YEAR - p.birthYear : null;

function RankBadge({ index }: { index: number }) {
  const base = "inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold tabular-nums leading-none"
  if (index === 0) return (
    <span className={cn(base, "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/25")}>
      {index + 1}
    </span>
  )
  if (index === 1) return (
    <span className={cn(base, "bg-slate-400/15 text-slate-500 dark:text-slate-300 ring-1 ring-slate-400/25")}>
      {index + 1}
    </span>
  )
  if (index === 2) return (
    <span className={cn(base, "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25")}>
      {index + 1}
    </span>
  )
  return (
    <span className={cn(base, "text-muted-foreground")}>
      {index + 1}
    </span>
  )
}

export async function RankingsCardServer() {
  try {
    // Player-rankings aggregation for the season (module-cached server-side).
    const allRankings = await getSummaries(SEASON);
    const limpopoRankings = allRankings.filter(isLimpopo);

    // A rotating "category" headline, derived from age (birthYear) + sex.
    const AGE_CAPS = [8, 10, 12, 14, 16, 18, 20];
    const filterOptions: (() => { filtered: RankedSummary[]; label: string })[] = [
      () => {
        const cap = AGE_CAPS[Math.floor(Math.random() * AGE_CAPS.length)];
        return {
          filtered: limpopoRankings.filter((p) => { const a = ageOf(p); return a != null && a <= cap; }),
          label: `Top 10 U${cap} Limpopo Players`,
        };
      },
      () => {
        const g = Math.random() < 0.5 ? "M" : "F";
        return {
          filtered: limpopoRankings.filter((p) => (p.sex ?? "").toUpperCase() === g),
          label: g === "M" ? "Top 10 Male Limpopo Players" : "Top 10 Female Limpopo Players",
        };
      },
      () => ({ filtered: limpopoRankings, label: "Top 10 Limpopo Players" }),
      () => ({
        filtered: limpopoRankings.filter((p) => { const a = ageOf(p); return a != null && a <= 16; }),
        label: "Top 10 Limpopo U16 Players",
      }),
      () => ({
        filtered: limpopoRankings.filter((p) => { const a = ageOf(p); return a != null && a >= 60; }),
        label: "Top 10 Limpopo Veterans",
      }),
      () => ({
        filtered: limpopoRankings.filter((p) => { const a = ageOf(p); return a != null && a >= 50; }),
        label: "Top 10 Limpopo Seniors",
      }),
    ];

    const { filtered, label } = filterOptions[Math.floor(Math.random() * filterOptions.length)]();

    const sorted = filtered
      .filter((p) => p.avgPerf)
      .sort((a, b) => b.avgPerf - a.avgPerf)
      .slice(0, 10);

    // Fall back to the overall top 10 when the random category is empty.
    const rankings =
      sorted.length === 0
        ? allRankings.filter((p) => p.avgPerf).sort((a, b) => b.avgPerf - a.avgPerf).slice(0, 10)
        : sorted;

    const categoryLabel = sorted.length === 0 ? "Top 10 Players Overall" : label;

    if (rankings.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm flex flex-col p-6 min-h-[300px]">
          <h2 className="text-lg font-bold mb-4 text-primary">Current Rankings</h2>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No rankings available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0 bg-muted/20">
          <Link href="/player-rankings" className="group flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary group-hover:text-primary/80 flex items-center gap-1.5 leading-tight">
              {categoryLabel}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </h2>
            <span className="text-xs font-semibold text-muted-foreground font-mono tabular-nums">
              {SEASON_LABEL}
            </span>
          </Link>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-10">
                    #
                  </th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">
                    Player
                  </th>
                  <th className="hidden sm:table-cell text-center px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                    Events
                  </th>
                  <th className="hidden md:table-cell text-left px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                    Fed
                  </th>
                  <th className="hidden lg:table-cell text-right px-2 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                    Rating
                  </th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                    APR
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((player, index) => (
                  <tr
                    key={player.key || index}
                    className={cn(
                      "border-b border-border/40 transition-colors hover:bg-muted/30",
                      index % 2 === 1 && "bg-muted/10",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <RankBadge index={index} />
                    </td>
                    <td className="px-2 py-2.5">
                      <span className={cn(
                        "font-medium line-clamp-1 block",
                        index < 3 && "font-semibold",
                      )}>
                        {player.name}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-2 py-2.5 text-center text-muted-foreground">
                      {player.ratedTournaments || 0}
                    </td>
                    <td className="hidden md:table-cell px-2 py-2.5">
                      <span className="text-muted-foreground">{player.federation || "—"}</span>
                    </td>
                    <td className="hidden lg:table-cell px-2 py-2.5 text-right text-muted-foreground">
                      {player.currentRating ?? player.fideRating ?? "—"}
                    </td>
                    <td className={cn(
                      "px-3 py-2.5 text-right font-bold tabular-nums whitespace-nowrap",
                      index === 0 ? "text-yellow-600 dark:text-yellow-400" :
                      index === 1 ? "text-slate-500 dark:text-slate-300" :
                      index === 2 ? "text-orange-600 dark:text-orange-400" :
                      "text-primary",
                    )}>
                      {player.avgPerf ? Math.round(player.avgPerf) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/10 flex-shrink-0">
            <Link
              href="/player-rankings"
              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1 group"
            >
              View All Rankings
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in RankingsCardServer:", error);
    return (
      <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm flex flex-col p-6 min-h-[300px]">
        <h2 className="text-lg font-bold mb-4 text-primary">Current Rankings</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-muted-foreground text-sm">Error loading rankings</p>
            <Link href="/player-rankings" className="mt-2 text-primary hover:underline text-sm">
              Try again
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
