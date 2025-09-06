// src/repositories/playerRepo.ts
import { createClient } from "@/utils/supabase/server"
import { detectTieBreaks } from "@/lib/tieBreakUtils"

export interface Player {
  id: number
  tournament_player_name: string
  normalized_name: string
  unique_no: number | null
  cf_rating: number | null
}

export interface PlayerTournament {
  tournament_id: string
  tournament_name: string | null
  tournament_points: number | null
  tournament_rating: number | null
  tournament_rank: number | null
  tie_breaks: Record<string, any> | null
  detected_tie_breaks: Record<string, string> | null
}

// Get distinct players (basic info only)
export async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("master_players")
    .select("id, tournament_player_name, normalized_name, unique_no, cf_rating")
    .limit(100)

  if (error) throw error
  return data as Player[]
}

// Get tournaments for a specific player (lazy fetch with heuristics)
export async function getPlayerTournaments(playerId: number): Promise<PlayerTournament[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("master_players")
    .select("tournament_id, tournament_name, tournament_points, tournament_rating, tournament_rank, tie_breaks")
    .eq("id", playerId)

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    detected_tie_breaks: detectTieBreaks(row.tie_breaks)
  }))
}
