// Cookie-free, read-only access to the public games data. The home page is
// statically regenerated (ISR), so it cannot go through actions.ts — that file's
// cookie-based Supabase client forces a route dynamic. These reads mirror the
// shapes in actions.ts using the anon client instead.

import { createClient } from "@/utils/supabase/client";
import { STATIC_TOURNAMENTS } from "./config";
import { formatTournamentName } from "./utils";
import type { GameData, TournamentMeta } from "./actions";
import { cache } from "@/utils/cache";

export async function listTournamentsPublic(): Promise<TournamentMeta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tournaments_meta")
    .select("id, name, alias, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading tournaments_meta:", error.message);
    return STATIC_TOURNAMENTS.map((t) => ({
      id: t.id,
      name: t.id,
      display_name: formatTournamentName(t.id),
    }));
  }

  const tournaments = (data ?? []).map((t) => ({
    ...t,
    display_name: t.alias || (typeof t.name === "string" ? formatTournamentName(t.name) : t.alias || t.name || t.id || "Unknown"),
  })) as TournamentMeta[];

  for (const staticT of STATIC_TOURNAMENTS) {
    if (!tournaments.some((t) => t.name === staticT.id)) {
      tournaments.push({ id: staticT.id, name: staticT.id, display_name: formatTournamentName(staticT.id) });
    }
  }
  return tournaments;
}

export interface GamesStats {
  /** Total games across every tournament games table. */
  games: number;
  /** Number of tournament game collections in the DB. */
  collections: number;
  /** Most recently uploaded collection (tournaments_meta is ordered newest-first). */
  latest: { name: string; date: string | null } | null;
}

/**
 * Headline figures for the home page's chess-games stat strip. Games live in one
 * table per tournament, so the total is a sum of head-only counts (no rows
 * pulled) across the valid tables, run in parallel. Cached for a day in process
 * memory (mirrors the games-card cache) so this fan-out runs at most once daily.
 */
export async function getGamesStats(): Promise<GamesStats> {
  const cacheKey = "home-games-stats";
  const cached = cache.get(cacheKey) as GamesStats | null;
  if (cached) return cached;

  const supabase = createClient();
  const tournaments = await listTournamentsPublic();
  // Same guard as fetchGamesPublic: table names are alphanumeric/underscore only.
  const valid = tournaments.filter((t) => t.name && /^[a-z0-9_]+$/.test(t.name));

  const counts = await Promise.all(
    valid.map(async (t) => {
      const { count, error } = await supabase
        .from(t.name)
        .select("id", { count: "exact", head: true });
      return error ? 0 : count ?? 0;
    }),
  );
  const games = counts.reduce((sum, n) => sum + n, 0);

  const newest = tournaments[0] ?? null; // listTournamentsPublic orders newest-first
  const latest = newest
    ? {
        name: newest.display_name || formatTournamentName(newest.name) || newest.name,
        date: newest.created_at ? newest.created_at.slice(0, 10) : null,
      }
    : null;

  const stats: GamesStats = { games, collections: valid.length, latest };
  cache.set(cacheKey, stats, 86400);
  return stats;
}

export async function fetchGamesPublic(tableName: string): Promise<GameData[]> {
  // Same guard as actions.ts: table names are alphanumeric/underscore only.
  if (!tableName || !/^[a-z0-9_]+$/.test(tableName)) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from(tableName)
    .select("id, created_at, title, pgn")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`Error fetching games from ${tableName}:`, error);
    return [];
  }

  // PGN may come back as a JSON object — chess.js needs a string.
  return (data ?? []).map((game) => ({
    ...game,
    pgn: game.pgn ? (typeof game.pgn === "string" ? game.pgn : JSON.stringify(game.pgn)) : "",
  }));
}
