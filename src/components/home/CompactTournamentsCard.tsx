import { getTournaments } from "@/app/tournaments/server-actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export async function CompactTournamentsCard() {
  const tournaments = await getTournaments();
  const t = tournaments[0];

  if (!t) {
    return (
      <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-4">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
          Latest Tournament
        </p>
        <p className="text-muted-foreground text-sm">No tournaments yet</p>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Build compact inline meta string
  const metaParts: string[] = [];
  if (formatDate(t.date)) metaParts.push(formatDate(t.date)!);
  if (t.location) metaParts.push(t.location);
  if (t.average_elo) metaParts.push(`Avg Elo ${Math.round(t.average_elo)}`);
  if (t.rounds) metaParts.push(`${t.rounds}R`);
  if (t.time_control) metaParts.push(t.time_control);

  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="group rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden block"
    >
      <div className="p-4">
        {/* Section label */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
            Latest Tournament
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
          {t.tournament_type && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">
              {t.tournament_type}
            </span>
          )}
        </div>

        {/* Tournament name — visual focus */}
        <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {t.tournament_name}
        </h3>

        {/* Inline meta — date · location · avg elo · rounds */}
        {metaParts.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {metaParts.join(" · ")}
          </p>
        )}

        {/* Chief arbiter if present */}
        {t.chief_arbiter && (
          <p className="mt-1 text-xs text-muted-foreground/70">
            CA: {t.chief_arbiter}
          </p>
        )}
      </div>
    </Link>
  );
}
