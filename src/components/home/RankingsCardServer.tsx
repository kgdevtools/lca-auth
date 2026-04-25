import {
  getRankingsForPeriod,
  type PlayerRanking,
} from "@/app/rankings/server-actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cache } from "@/utils/cache";
import { cn } from "@/lib/utils";

const AGE_GROUPS = ["U8", "U10", "U12", "U14", "U16", "U18", "U20", "Seniors"];
const GENDERS = ["M", "F"];
const FEDERATIONS = ["LCP", "LMG", "LVT", "LWT", "LSG", "LIM"];

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
    const rankingsCacheKey = "rankings-2025-2026";
    let allRankings: PlayerRanking[] | null = cache.get(rankingsCacheKey);

    if (!allRankings) {
      allRankings = await getRankingsForPeriod("2025-2026");
      cache.set(rankingsCacheKey, allRankings, 86400);
    }

    const limpopoRankings = allRankings.filter((p) =>
      FEDERATIONS.includes(p.fed || ""),
    );

    const filterOptions = [
      () => {
        const randomAge = AGE_GROUPS[Math.floor(Math.random() * AGE_GROUPS.length)];
        return { filtered: limpopoRankings.filter((p) => p.age_group === randomAge), label: `Top 10 ${randomAge} Limpopo Players` };
      },
      () => {
        const randomGender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
        return {
          filtered: limpopoRankings.filter((p) => p.sex === randomGender),
          label: randomGender === "M" ? "Top 10 Male Limpopo Players" : "Top 10 Female Limpopo Players",
        };
      },
      () => ({ filtered: limpopoRankings, label: "Top 10 Limpopo Players" }),
      () => {
        const age16AndUnder = limpopoRankings.filter((p) => p.age_years != null && p.age_years <= 16);
        return { filtered: age16AndUnder, label: "Top 10 Limpopo U16 Players" };
      },
      () => {
        const veterans = limpopoRankings.filter((p) => p.age_years != null && p.age_years >= 60);
        return { filtered: veterans, label: "Top 10 Limpopo Veterans" };
      },
      () => {
        const seniors = limpopoRankings.filter((p) => p.age_years != null && p.age_years >= 50);
        return { filtered: seniors, label: "Top 10 Limpopo Seniors" };
      },
      () => {
        const u10 = limpopoRankings.filter((p) => p.age_years != null && p.age_years <= 10);
        return { filtered: u10, label: "Top 10 Limpopo U10 Players" };
      },
      () => ({ filtered: limpopoRankings.filter((p) => p.sex === "F"), label: "Top 10 Limpopo Female Players" }),
      () => ({ filtered: limpopoRankings.filter((p) => p.sex === "M"), label: "Top 10 Limpopo Male Players" }),
    ];

    const randomFilter = filterOptions[Math.floor(Math.random() * filterOptions.length)];
    const { filtered, label } = randomFilter();

    const sorted = filtered
      .filter((p) => p.avg_performance_rating)
      .sort((a, b) => (b.avg_performance_rating || 0) - (a.avg_performance_rating || 0))
      .slice(0, 10);

    const rankings =
      sorted.length === 0
        ? allRankings
            .filter((p) => p.avg_performance_rating)
            .sort((a, b) => (b.avg_performance_rating || 0) - (a.avg_performance_rating || 0))
            .slice(0, 10)
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
          <Link href="/rankings" className="group flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary group-hover:text-primary/80 flex items-center gap-1.5 leading-tight">
              {categoryLabel}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </h2>
            <span className="text-xs font-semibold text-muted-foreground font-mono tabular-nums">
              2025–2026
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
                    key={player.name_key || index}
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
                      {player.tournaments_count || 0}
                    </td>
                    <td className="hidden md:table-cell px-2 py-2.5">
                      <span className="text-muted-foreground">{player.fed || "—"}</span>
                    </td>
                    <td className="hidden lg:table-cell px-2 py-2.5 text-right text-muted-foreground">
                      {player.rating || "—"}
                    </td>
                    <td className={cn(
                      "px-3 py-2.5 text-right font-bold tabular-nums whitespace-nowrap",
                      index === 0 ? "text-yellow-600 dark:text-yellow-400" :
                      index === 1 ? "text-slate-500 dark:text-slate-300" :
                      index === 2 ? "text-orange-600 dark:text-orange-400" :
                      "text-primary",
                    )}>
                      {player.avg_performance_rating
                        ? Math.round(player.avg_performance_rating)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/10 flex-shrink-0">
            <Link
              href="/rankings"
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
            <Link href="/rankings" className="mt-2 text-primary hover:underline text-sm">
              Try again
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
