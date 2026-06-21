// Cookie-free, read-only access to the public games data. The home page is
// statically regenerated (ISR), so it cannot go through actions.ts — that file's
// cookie-based Supabase client forces a route dynamic. These reads mirror the
// shapes in actions.ts using the anon client instead. All reads come from the
// unified `games` table + `tournaments_meta` registry.

import { createClient } from "@/utils/supabase/client";
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
    return [];
  }

  return (data ?? []).map((t) => ({
    ...t,
    display_name: t.alias || (typeof t.name === "string" ? formatTournamentName(t.name) : t.name || t.id),
  })) as TournamentMeta[];
}

/**
 * The tournament whose most-recently-added game is newest — i.e. wherever games
 * were last uploaded. Drives the home games card so it always features the latest
 * additions instead of a fixed/rotating pick. Optionally skips excluded
 * tournament ids. One indexed read (newest game), no per-tournament fan-out.
 */
export async function getLatestGamesTournament(
  excludeIds: string[] = [],
): Promise<{ tournamentId: string; createdAt: string } | null> {
  const supabase = createClient();
  const base = supabase
    .from("games")
    .select("tournament_id, created_at")
    .not("tournament_id", "is", null);
  const filtered = excludeIds.length > 0
    ? base.not("tournament_id", "in", `(${excludeIds.join(",")})`)
    : base;

  const { data, error } = await filtered
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("Error finding latest games tournament:", error.message);
    return null;
  }
  const row = data?.[0] as { tournament_id: string | null; created_at: string } | undefined;
  if (!row?.tournament_id) return null;
  return { tournamentId: row.tournament_id, createdAt: row.created_at };
}

export async function fetchGamesPublic(tournamentId: string): Promise<GameData[]> {
  if (!tournamentId) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, created_at, title, pgn, full_pgn, date, round")
    .eq("tournament_id", tournamentId)
    .order("date", { ascending: true, nullsFirst: false })
    .order("round", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching games for ${tournamentId}:`, error.message);
    return [];
  }

  return (data ?? []).map((g: { id: string; created_at: string; title: string | null; pgn: string | null; full_pgn: string | null }) => ({
    id: String(g.id),
    created_at: g.created_at,
    title: g.title ?? "",
    pgn: g.full_pgn || g.pgn || "",
  }));
}

export interface GamesStats {
  /** Total games across all tournaments. */
  games: number;
  /** Number of tournament collections in the registry. */
  collections: number;
  /** Most recently added collection. */
  latest: { name: string; date: string | null } | null;
}

/**
 * Headline figures for the home page's chess-games stat strip. With the unified
 * table this is a single head-only count plus the newest registry row — no more
 * per-table fan-out. Cached for a day in process memory.
 */
export async function getGamesStats(): Promise<GamesStats> {
  const cacheKey = "home-games-stats";
  const cached = cache.get(cacheKey) as GamesStats | null;
  if (cached) return cached;

  const supabase = createClient();
  const [{ count: games }, { count: collections }, { data: newestRows }] = await Promise.all([
    supabase.from("games").select("id", { count: "exact", head: true }),
    supabase.from("tournaments_meta").select("id", { count: "exact", head: true }),
    supabase.from("tournaments_meta").select("name, alias, created_at").order("created_at", { ascending: false }).limit(1),
  ]);

  const newest = newestRows?.[0] as { name: string; alias: string | null; created_at: string | null } | undefined;
  const latest = newest
    ? {
        name: newest.alias || formatTournamentName(newest.name),
        date: newest.created_at ? newest.created_at.slice(0, 10) : null,
      }
    : null;

  const stats: GamesStats = { games: games ?? 0, collections: collections ?? 0, latest };
  cache.set(cacheKey, stats, 86400);
  return stats;
}
