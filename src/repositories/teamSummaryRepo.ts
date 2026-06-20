import { createClient } from "@/utils/supabase/server"
import type { TeamSummaryData } from "@/services/teamSummaryParser"

export interface SaveTeamSummaryResult {
  tournament_id: string
  teams_upserted: number
  players_upserted: number
}

/**
 * Persist a parsed team-tournament SUMMARY (Composition + Performance) to the
 * Academy DB: get-or-create the `team_tournaments` row (by name, shared with the
 * round-file flow), update team standings on `teams`, and upsert the per-player
 * `team_player_performance` rows. Idempotent: re-uploading updates in place.
 */
export async function saveTeamSummary(data: TeamSummaryData): Promise<SaveTeamSummaryResult> {
  const supabase = await createClient()
  const name = data.metadata.tournament_name
  if (!name) throw new Error("Missing tournament name")

  // 1. Get or create the team tournament (shared with the round-file flow by name).
  const { data: existing } = await supabase
    .from("team_tournaments")
    .select("id")
    .eq("tournament_name", name)
    .maybeSingle()

  let tournamentId: string
  if (existing) {
    tournamentId = existing.id
  } else {
    const { data: created, error } = await supabase
      .from("team_tournaments")
      .insert({
        tournament_name: name,
        organizer: data.metadata.organizer ?? null,
        chief_arbiter: data.metadata.chief_arbiter ?? null,
        deputy_chief_arbiter: data.metadata.deputy_chief_arbiter ?? null,
        tournament_director: data.metadata.tournament_director ?? null,
        arbiter: data.metadata.arbiter ?? null,
        location: data.metadata.location ?? null,
        date: data.metadata.date ?? null,
        rounds: data.metadata.rounds ?? 0,
        tournament_type: "Team",
      })
      .select("id")
      .single()
    if (error || !created) throw new Error(`Failed to create team tournament: ${error?.message}`)
    tournamentId = created.id
  }

  // 2. Upsert team standings (match points / game points) onto `teams`.
  let teamsUpserted = 0
  for (const t of data.teams) {
    const { data: team } = await supabase
      .from("teams")
      .select("id")
      .eq("team_tournament_id", tournamentId)
      .eq("team_name", t.team_name)
      .maybeSingle()
    if (team) {
      await supabase
        .from("teams")
        .update({ match_points: t.match_points, game_points: t.game_points })
        .eq("id", team.id)
    } else {
      await supabase.from("teams").insert({
        team_tournament_id: tournamentId,
        team_name: t.team_name,
        match_points: t.match_points,
        game_points: t.game_points,
        tie_breaks: {},
      })
    }
    teamsUpserted++
  }

  // 3. Upsert per-player performance rows (natural key handles re-uploads).
  const rows = data.players.map((p) => ({
    team_tournament_id: tournamentId,
    tournament_name: name,
    team_name: p.team_name,
    player_name: p.name,
    federation: p.federation,
    board: p.board,
    rating: p.rating,
    points: p.points,
    games: p.games,
    wins: p.wins,
    performance_rating: p.performance_rating,
    pct: p.pct,
    rtg_avg: p.rtg_avg,
    per_round: p.per_round,
    opponents: p.opponents ?? [],
  }))

  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from("team_player_performance")
      .upsert(rows, { onConflict: "team_tournament_id,team_name,player_name" })
    if (upErr) throw new Error(`Failed to upsert player performance: ${upErr.message}`)
  }

  return { tournament_id: tournamentId, teams_upserted: teamsUpserted, players_upserted: rows.length }
}
