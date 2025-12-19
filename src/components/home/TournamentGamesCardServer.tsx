import { fetchGames, listTournaments, type GameData, type TournamentMeta } from "@/app/view/actions";
import Link from "next/link";
import { TournamentGamesCardClient } from "./TournamentGamesCardClient";
import { cache } from "@/utils/cache";

// Function to get today's random tournament (same for all users)
async function getTodaysTournament(): Promise<TournamentMeta | null> {
  try {
    // Create a deterministic cache key based on the current date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cacheKey = `tournament-${dateStr}`;

    // Check if we have cached data for today
    let cachedTournament = cache.get(cacheKey);
    if (cachedTournament) {
      return cachedTournament;
    }

    const { tournaments } = await listTournaments();
    if (tournaments.length === 0) {
      return null;
    }

    // Create a deterministic seed based on the current date
    // Simple hash function to create a deterministic seed
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }

    // Use the hash to select a tournament
    const randomIndex = Math.abs(hash) % tournaments.length;
    const selectedTournament = tournaments[randomIndex];

    // Cache the selected tournament for the rest of the day (24 hours from now)
    cache.set(cacheKey, selectedTournament, 86400); // 24 hours in seconds

    return selectedTournament;
  } catch (error) {
    console.error('Error getting today\'s tournament:', error);
    return null;
  }
}

export async function TournamentGamesCardServer() {
  try {
    const selectedTournament = await getTodaysTournament();

    if (!selectedTournament) {
      return (
        <Link
          href="/view"
          className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center p-6"
        >
          <p className="text-muted-foreground">No tournaments available</p>
        </Link>
      );
    }

    // Create a cache key for the games of the selected tournament
    const gamesCacheKey = `games-${selectedTournament.name}`;
    let games: GameData[] | null = cache.get(gamesCacheKey);

    if (!games) {
      const result = await fetchGames(selectedTournament.name as any);
      if (result.error) {
        console.error('Error fetching games:', result.error);
        return (
          <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">Error loading games</p>
            <Link href="/view" className="mt-2 text-primary hover:underline">Try again</Link>
          </div>
        );
      } else {
        // Cache the games for 24 hours
        games = [...result.games];
        cache.set(gamesCacheKey, games, 86400);
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

    // Shuffle games for variety (but keep the same shuffle each time for consistency)
    const shuffledGames = [...games].sort(() => 0.5 - Math.random());

    // Pass the data to the client component for animation
    return <TournamentGamesCardClient games={shuffledGames} selectedTournament={selectedTournament} />;
  } catch (error) {
    console.error('Error in TournamentGamesCardServer:', error);
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Error loading games</p>
        <Link href="/view" className="mt-2 text-primary hover:underline">Try again</Link>
      </div>
    );
  }
}