"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardCategory } from "./homeRankings";

function RankBadge({ index }: { index: number }) {
  const base = "inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold tabular-nums leading-none";
  if (index === 0) return (
    <span className={cn(base, "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 ring-1 ring-yellow-500/25")}>{index + 1}</span>
  );
  if (index === 1) return (
    <span className={cn(base, "bg-slate-400/15 text-slate-500 dark:text-slate-300 ring-1 ring-slate-400/25")}>{index + 1}</span>
  );
  if (index === 2) return (
    <span className={cn(base, "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25")}>{index + 1}</span>
  );
  return <span className={cn(base, "text-muted-foreground")}>{index + 1}</span>;
}

export function RankingsCardClient({
  categories,
  seasonLabel,
}: {
  categories: CardCategory[];
  seasonLabel: string;
}) {
  const [active, setActive] = useState(0);
  const cat = categories[active];
  // The juniors list is all-qualified by construction; Most Wins doesn't judge criteria.
  const showQualified = cat.id !== "juniors" && cat.id !== "wins";

  return (
    <div className="rounded border border-border bg-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Link href="/player-rankings" className="group flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
            Player rankings — Limpopo
            <ArrowRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </h2>
          <span className="text-xs font-semibold text-muted-foreground font-mono tabular-nums shrink-0">
            Top 10 · {seasonLabel}
          </span>
        </Link>
        {/* Category chips — stable default, no daily roulette */}
        <div className="flex gap-1 mt-2.5 overflow-x-auto scrollbar-thin">
          {categories.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap transition-colors",
                i === active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table — compact rows so the full top-10 fits without scrolling */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground w-10">#</th>
                <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Player</th>
                <th className="hidden sm:table-cell text-center px-2 py-1.5 font-semibold text-muted-foreground whitespace-nowrap">Events</th>
                <th className="hidden md:table-cell text-left px-2 py-1.5 font-semibold text-muted-foreground whitespace-nowrap">Fed</th>
                <th className="hidden lg:table-cell text-right px-2 py-1.5 font-semibold text-muted-foreground whitespace-nowrap">Rating</th>
                <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground whitespace-nowrap">
                  {cat.metric === "Wins" ? (
                    <span className="inline-flex items-center gap-1" title="Tournament victories (1st-place finishes), not individual game wins">
                      <Trophy className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                      Wins
                    </span>
                  ) : (
                    cat.metric
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {cat.rows.map((player, index) => (
                <tr
                  key={player.key || index}
                  className={cn(
                    "border-b border-border/40 transition-colors hover:bg-muted/30",
                    index % 2 === 1 && "bg-muted/10",
                  )}
                >
                  <td className="px-3 py-1.5"><RankBadge index={index} /></td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={cn("font-medium line-clamp-1", index < 3 && "font-semibold")}>
                        {player.name}
                      </span>
                      {showQualified && player.qualified && (
                        <span
                          title="Meets CDC selection criteria"
                          className="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25"
                        >
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 py-1.5 text-center text-muted-foreground">
                    {player.events}
                  </td>
                  <td className="hidden md:table-cell px-2 py-1.5">
                    <span className="text-muted-foreground">{player.fed || "—"}</span>
                  </td>
                  <td className="hidden lg:table-cell px-2 py-1.5 text-right text-muted-foreground tabular-nums">
                    {player.rating ?? "—"}
                  </td>
                  <td className={cn(
                    "px-3 py-1.5 text-right font-bold tabular-nums whitespace-nowrap",
                    index === 0 ? "text-yellow-600 dark:text-yellow-400" :
                    index === 1 ? "text-slate-500 dark:text-slate-300" :
                    index === 2 ? "text-orange-600 dark:text-orange-400" :
                    "text-primary",
                  )}>
                    {player.value ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
