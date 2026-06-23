import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { UpcomingTournamentCardServer } from "@/components/home/UpcomingTournamentCard";
import { RankingsCardServer } from "@/components/home/RankingsCardServer";
import { TournamentGamesCardServer } from "@/components/home/TournamentGamesCardServer";
import { CountUp } from "@/components/home/CountUp";
import { getRankingStats, getSummaries } from "@/lib/rankingsServer";
import { getGamesStats } from "@/lib/chess-games/publicData";
import { SEASON, SEASON_LABEL, isLocal, meetsCriteria } from "@/components/home/homeRankings";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Limpopo Chess Academy — view tournament games, independent player rankings, puzzles and structured chess lessons.",
};

// Everything on this page tolerates being up to an hour stale (rankings refresh
// hourly, games/blog daily), so regenerate statically instead of rendering per
// request. The board ships client-side only (see TournamentGamesCardClient).
export const revalidate = 3600;

async function StatStrip() {
  try {
    const [stats, season] = await Promise.all([getRankingStats(), getSummaries(SEASON)]);
    const qualified = season.filter((p) => isLocal(p) && meetsCriteria(p)).length;
    const items: [number, string][] = [
      [stats.players, "players tracked"],
      [stats.tournaments, "tournaments covered"],
      [qualified, `CDC-qualified ${SEASON_LABEL}`],
    ];
    return (
      <div className="space-y-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {items.map(([value, label]) => (
            <div key={label}>
              <dd className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums font-mono">
                <CountUp value={value} />
              </dd>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
                {label}
              </dt>
            </div>
          ))}
        </dl>
        {stats.latest && (
          <p className="text-xs text-muted-foreground">
            <span className="text-[10px] font-semibold uppercase tracking-widest">Most recent tournament</span>
            <br />
            <Link href="/player-rankings" className="font-semibold text-foreground hover:text-primary transition-colors">
              {stats.latest.name}
            </Link>
            {stats.latest.date && <span className="tabular-nums"> · {stats.latest.date}</span>}
          </p>
        )}
      </div>
    );
  } catch {
    return null; // the hero reads fine without numbers
  }
}

async function GamesStatStrip() {
  try {
    const stats = await getGamesStats();
    if (stats.games === 0) return null;
    const items: [number, string][] = [
      [stats.games, "games in the database"],
      [stats.collections, "tournament collections"],
    ];
    return (
      <div className="space-y-3">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {items.map(([value, label]) => (
            <div key={label}>
              <dd className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums font-mono">
                <CountUp value={value} />
              </dd>
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-0.5">
                {label}
              </dt>
            </div>
          ))}
        </dl>
        {stats.latest && (
          <p className="text-xs text-muted-foreground">
            <span className="text-[10px] font-semibold uppercase tracking-widest">Recently uploaded</span>
            <br />
            <Link href="/chess-games" className="font-semibold text-foreground hover:text-primary transition-colors">
              {stats.latest.name}
            </Link>
            {stats.latest.date && <span className="tabular-nums"> · {stats.latest.date}</span>}
          </p>
        )}
      </div>
    );
  } catch {
    return null; // the board above stands on its own
  }
}

export default function Home() {
  return (
    <section className="min-h-dvh px-4 sm:px-6 lg:px-8 py-5 sm:py-7 mx-auto max-w-7xl text-foreground">
      {/* Hero — copy + actions | live board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mb-10 sm:mb-12">
        <div className="space-y-6 lg:pt-2">
          <div className="space-y-4">
            {/* Fluid size + nowrap: scales with the viewport so the name always
                sits on ONE line, from small phones up to desktop. */}
            <h1 className="text-[clamp(1.5rem,7.8vw,3rem)] font-bold tracking-tighter whitespace-nowrap">
              Limpopo Chess Academy
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
              Limpopo Chess Academy is a chess hub dedicated to growing young minds
              into focused, exceptional future leaders. Based in Polokwane, our
              sessions range from relaxed, interactive lessons — aimed at encouraging
              independent, structured thinking and bringing out that creative spark —
              to challenging, tournament-ready programs. Whether you&apos;re new to
              chess or want to deepen your understanding of the game, get in touch with one of our {" "}
              <Link href="/forms/contact-us" className="font-bold text-primary no-underline hover:text-primary/80 transition-colors">
                Coaches
              </Link>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/player-rankings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View rankings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-semibold border border-border hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors"
            >
              Upcoming tournaments
            </Link>
            <Link
              href="/academy"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-semibold border border-border hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors"
            >
              Learn at the academy
            </Link>
          </div>

          <StatStrip />
          <GamesStatStrip />
        </div>

        {/* The live board IS the hero visual. */}
        <TournamentGamesCardServer />
      </div>

      {/* What's happening — tournament + rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <UpcomingTournamentCardServer />
        <RankingsCardServer />
      </div>
    </section>
  );
}
