import {
  fetchGames,
  listTournaments,
  type GameData,
  type TournamentMeta,
} from "@/app/view/actions";
import Link from "next/link";
import { TournamentGamesCardClient } from "./TournamentGamesCardClient";
import { cache } from "@/utils/cache";

/**
 * TEMPORARY CONFIG — FORCE THIS TOURNAMENT IN HEADER + GAMES
 */
const FORCED_TOURNAMENT_TABLE = "cdc_tournament_1_2026_games";
const FORCED_TOURNAMENT_END = new Date("2026-02-16T23:59:59Z");

// Function to get today's random tournament (same for all users)
async function getTodaysTournament(): Promise<TournamentMeta | null> {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cacheKey = `tournament-${dateStr}`;

    const cachedTournament = cache.get(cacheKey);
    if (cachedTournament) {
      return cachedTournament;
    }

    const { tournaments } = await listTournaments();
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
    const now = new Date();
    const withinForcedPeriod = now <= FORCED_TOURNAMENT_END;

    const dailyTournament = await getTodaysTournament();

    /**
     * HEADER TOURNAMENT
     * During forced period → override header tournament
     */
    let headerTournament: TournamentMeta | null = dailyTournament;

    if (withinForcedPeriod) {
      headerTournament = {
        name: FORCED_TOURNAMENT_TABLE,
        alias: "CDC Tournament 1 — 2026",
        display_name: "CDC Tournament 1 — 2026",
        created_at: "2026-02-10",
      } as TournamentMeta;
    }

    if (!headerTournament) {
      return (
        <Link
          href="/view"
          className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center p-6"
        >
          <p className="text-muted-foreground">No tournaments available</p>
        </Link>
      );
    }

    const games: GameData[] = [];

    /**
     * 1. FORCED TOURNAMENT GAMES (TEMPORARY)
     */
    if (withinForcedPeriod) {
      const forcedCacheKey = `games-${FORCED_TOURNAMENT_TABLE}`;
      let forcedGames: GameData[] | null = cache.get(forcedCacheKey);

      if (!forcedGames) {
        const result = await fetchGames(FORCED_TOURNAMENT_TABLE as any);
        if (!result.error) {
          forcedGames = [...result.games];
          cache.set(forcedCacheKey, forcedGames, 86400);
        } else {
          console.error(
            "Error fetching forced tournament games:",
            result.error,
          );
        }
      }

      if (forcedGames?.length) {
        games.push(...forcedGames);
      }
    }

    /**
     * 2. DAILY RANDOM TOURNAMENT GAMES (UNCHANGED)
     */
    if (dailyTournament) {
      const dailyCacheKey = `games-${dailyTournament.name}`;
      let dailyGames: GameData[] | null = cache.get(dailyCacheKey);

      if (!dailyGames) {
        const result = await fetchGames(dailyTournament.name as any);
        if (!result.error) {
          dailyGames = [...result.games];
          cache.set(dailyCacheKey, dailyGames, 86400);
        } else {
          console.error("Error fetching daily tournament games:", result.error);
        }
      }

      if (dailyGames?.length) {
        games.push(...dailyGames);
      }
    }

    if (games.length === 0) {
      return (
        <Link
          href="/view"
          className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center p-6"
        >
          <p className="text-muted-foreground">No games available</p>
        </Link>
      );
    }

    const shuffledGames = [...games].sort(() => 0.5 - Math.random());

    return (
      <TournamentGamesCardClient
        games={shuffledGames}
        selectedTournament={headerTournament}
      />
    );
  } catch (error) {
    console.error("Error in TournamentGamesCardServer:", error);
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Error loading games</p>
        <Link href="/view" className="mt-2 text-primary hover:underline">
          Try again
        </Link>
      </div>
    );
  }
}
