// Cookie-free, read-only access to the public games data. The home page is
// statically regenerated (ISR), so it cannot go through actions.ts — that file's
// cookie-based Supabase client forces a route dynamic. These reads mirror the
// shapes in actions.ts using the anon client instead.

import { createClient } from "@/utils/supabase/client";
import { STATIC_TOURNAMENTS } from "./config";
import { formatTournamentName } from "./utils";
import type { GameData, TournamentMeta } from "./actions";

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
