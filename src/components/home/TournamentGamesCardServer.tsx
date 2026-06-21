import type { GameData } from "@/lib/chess-games/actions";
import { fetchGamesPublic, listTournamentsPublic, getLatestGamesTournament } from "@/lib/chess-games/publicData";
import Link from "next/link";
import { TournamentGamesCardClient } from "./TournamentGamesCardClient";
import { cache } from "@/utils/cache";

// Tournament intentionally kept out of the featured slot.
const EXCLUDED_TABLES = ["cdc_jq_tournament_7_2025_u20_games"];

export async function TournamentGamesCardServer() {
  try {
    const tournaments = await listTournamentsPublic();
    if (tournaments.length === 0) {
      return (
        <Link
          href="/chess-games"
          className="rounded border border-border flex flex-col items-center justify-center p-6 min-h-[280px]"
        >
          <p className="text-muted-foreground">No tournaments available</p>
        </Link>
      );
    }

    // Feature wherever games were most recently added (skip the excluded one).
    const excludeIds = tournaments.filter((t) => t.name && EXCLUDED_TABLES.includes(t.name)).map((t) => t.id);
    const latest = await getLatestGamesTournament(excludeIds);
    const tournament = latest ? tournaments.find((t) => t.id === latest.tournamentId) ?? null : null;

    if (!tournament) {
      return (
        <Link
          href="/chess-games"
          className="rounded border border-border flex flex-col items-center justify-center p-6 min-h-[280px]"
        >
          <p className="text-muted-foreground">No games available</p>
        </Link>
      );
    }

    // Cache key carries the latest add time, so a new upload busts it immediately
    // (no stale featured set) while repeat views within the window stay cheap.
    const gamesCacheKey = `home-games-${tournament.id}-${latest!.createdAt}`;
    let games: GameData[] | null = cache.get(gamesCacheKey);
    if (!games) {
      const fetched = await fetchGamesPublic(tournament.id);
      if (fetched.length > 0) {
        // Newest-added first so the card opens on the latest game.
        games = [...fetched].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
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
