import type { GameData, TournamentMeta } from "@/lib/chess-games/actions";
import { fetchGamesPublic, listTournamentsPublic } from "@/lib/chess-games/publicData";
import Link from "next/link";
import { TournamentGamesCardClient } from "./TournamentGamesCardClient";
import { cache } from "@/utils/cache";

/** Deterministic daily rotation — same tournament for everyone on a given day. */
async function getTodaysTournament(): Promise<TournamentMeta | null> {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cacheKey = `tournament-${dateStr}`;

    const cachedTournament = cache.get(cacheKey);
    if (cachedTournament) return cachedTournament;

    const tournaments = await listTournamentsPublic();
    if (tournaments.length === 0) return null;

    const EXCLUDED_TABLES = ["cdc_jq_tournament_7_2025_u20_games"];
    const filtered = tournaments.filter(
      (t) => t && t.name && !EXCLUDED_TABLES.includes(t.name),
    );
    if (filtered.length === 0) return null;

    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }

    const selected = filtered[Math.abs(hash) % filtered.length];
    cache.set(cacheKey, selected, 86400);
    return selected;
  } catch (error) {
    console.error("Error getting today's tournament:", error);
    return null;
  }
}

export async function TournamentGamesCardServer() {
  try {
    const tournament = await getTodaysTournament();

    if (!tournament) {
      return (
        <Link
          href="/chess-games"
          className="rounded border border-border flex flex-col items-center justify-center p-6 min-h-[280px]"
        >
          <p className="text-muted-foreground">No tournaments available</p>
        </Link>
      );
    }

    const gamesCacheKey = `games-${tournament.id}`;
    let games: GameData[] | null = cache.get(gamesCacheKey);
    if (!games) {
      const fetched = await fetchGamesPublic(tournament.id);
      if (fetched.length > 0) {
        games = fetched;
        cache.set(gamesCacheKey, games, 86400);
      }
    }

    if (!games || games.length === 0) {
      return (
        <Link
          href="/chess-games"
          className="rounded border border-border flex flex-col items-center justify-center p-6 min-h-[280px]"
        >
          <p className="text-muted-foreground">No games available</p>
        </Link>
      );
    }

    return <TournamentGamesCardClient games={games} selectedTournament={tournament} />;
  } catch (error) {
    console.error("Error in TournamentGamesCardServer:", error);
    return (
      <div className="rounded border border-border flex flex-col items-center justify-center p-6 min-h-[280px]">
        <p className="text-muted-foreground">Error loading games</p>
        <Link href="/chess-games" className="mt-2 text-primary hover:underline">
          Try again
        </Link>
      </div>
    );
  }
}
