/**
 * Team-tournament opponent resolution for the player profile (Option B).
 *
 * Team events bridge into the rankings as sd_players rows with no round tokens, so
 * the normal token resolver can't find opponents. Instead we read the per-round
 * opponents that were INFERRED from the Team Composition at upload time and stored
 * on team_player_performance.opponents (see teamPairingInference.ts) — no round
 * files needed. sd_tournaments.id == team_tournaments.id, so the profile's
 * appearance.tournamentId matches team_player_performance.team_tournament_id.
 */
import { createClient } from "@/utils/supabase/server";
import type { GameEntry } from "./playerProfileServer";

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

interface StoredOpponent {
  round?: number; result?: "win" | "loss" | "draw" | null;
  opponentName?: string | null; opponentRating?: number | null; opponentFed?: string | null;
}

/**
 * Games for `playerName` across any of `tournamentIds` that are team tournaments.
 * Returns a map (team_tournament_id → GameEntry[]); non-team tournaments are absent.
 * Best-effort: returns an empty map on any failure.
 */
export async function fetchTeamGamesForPlayer(
  tournamentIds: string[],
  playerName: string,
): Promise<Map<string, GameEntry[]>> {
  const out = new Map<string, GameEntry[]>();
  const ids = [...new Set(tournamentIds)].filter(Boolean);
  if (ids.length === 0 || !playerName) return out;

  try {
    const supabase = await createClient();
    const pNorm = norm(playerName);

    const { data, error } = await supabase
      .from("team_player_performance")
      .select("team_tournament_id, player_name, opponents")
      .in("team_tournament_id", ids);
    if (error || !data?.length) return out;

    for (const row of data as { team_tournament_id: string; player_name: string; opponents: StoredOpponent[] | null }[]) {
      if (norm(row.player_name) !== pNorm) continue;
      const opps = Array.isArray(row.opponents) ? row.opponents : [];
      if (opps.length === 0) continue;
      const games: GameEntry[] = opps.map((o) => ({
        round: o.round ?? 0,
        opponentName: o.opponentName ?? null,
        opponentRank: null,
        opponentRating: o.opponentRating ?? null,
        opponentFed: o.opponentFed ?? null,
        color: null, // colour isn't recoverable from the composition
        result: o.result ?? null,
      }));
      const merged = [...(out.get(row.team_tournament_id) ?? []), ...games].sort((a, b) => a.round - b.round);
      out.set(row.team_tournament_id, merged);
    }
    return out;
  } catch (err) {
    console.error("[teamGames] lookup failed:", err);
    return out;
  }
}
