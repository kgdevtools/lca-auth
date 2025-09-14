import { parseExcelToJson, type TournamentData } from "@/services/parserService"
import { createClient } from "@/utils/supabase/server"

export interface SaveTournamentResult {
  tournament_id: string
  players_inserted: number
}

export async function saveTournamentNormalized(data: TournamentData): Promise<SaveTournamentResult> {
  const supabase = await createClient()
  
  // Add debug logging
  console.log("=== TOURNAMENT INSERT DEBUG ===")
  console.log("Parser output metadata:", JSON.stringify(data.tournament_metadata, null, 2))

  const name = data.tournament_metadata.tournament_name ?? null
  if (name) {
    console.log("Checking for duplicate tournament name:", name)
    const { data: existing, error: dupErr } = await supabase
      .from("tournaments")
      .select("id")
      .eq("tournament_name", name)
      .limit(1)
    
    if (dupErr) {
      console.log("Duplicate check error:", dupErr)
      throw dupErr
    }
    
    if (existing && existing.length > 0) {
      console.log("Found existing tournament with same name")
      throw new Error("A tournament with the same name already exists")
    }
  }

  // Prepare tournament data with fallback field mapping
  const tournamentData = {
    tournament_name: data.tournament_metadata.tournament_name ?? null,
    organizer: data.tournament_metadata.organizer ?? null,
    federation: data.tournament_metadata.federation ?? null,
    tournament_director: data.tournament_metadata.tournament_director ?? null,
    chief_arbiter: data.tournament_metadata.chief_arbiter ?? null,
    arbiter: data.tournament_metadata.arbiter ?? null,
    time_control: data.tournament_metadata.time_control ?? null,
    // FIXED: Handle both field name variations
    rate_of_play: data.tournament_metadata.rate_of_play ?? null,
    location: data.tournament_metadata.location ?? null,
    rounds: data.tournament_metadata.rounds ?? null,
    tournament_type: data.tournament_metadata.tournament_type ?? null,
    rating_calculation: data.tournament_metadata.rating_calculation ?? null,
    date: data.tournament_metadata.date ?? null,
    average_elo: data.tournament_metadata.average_elo ?? null,
    average_age: data.tournament_metadata.average_age ?? null,
    source: data.tournament_metadata.source ?? null,
  }

  console.log("Tournament data being inserted:", JSON.stringify(tournamentData, null, 2))

  const { data: tournamentRow, error: tournamentError } = await supabase
    .from("tournaments")
    .insert([tournamentData])
    .select("id")
    .single()

  if (tournamentError) {
    console.log("=== SUPABASE INSERT ERROR ===")
    console.log("Error details:", JSON.stringify(tournamentError, null, 2))
    console.log("Error message:", tournamentError.message)
    console.log("Error code:", tournamentError.code)
    console.log("Error hint:", tournamentError.hint)
    throw new Error(`Failed to insert tournament: ${tournamentError.message}`)
  }

  if (!tournamentRow) {
    console.log("No tournament row returned from insert")
    throw new Error("Failed to insert tournament: No data returned")
  }

  console.log("Tournament inserted successfully with ID:", tournamentRow.id)

  const tournamentId: string = tournamentRow.id

  const players = data.player_rankings.map((p) => ({
    tournament_id: tournamentId,
    rank: p.rank,
    name: p.name ?? null,
    federation: p.federation ?? null,
    rating: p.rating,
    points: p.points,
    rounds: p.rounds ?? [],
    tie_breaks: p.tie_breaks ?? {},
  }))

  console.log(`Inserting ${players.length} players`)
  if (players.length > 0) {
    console.log("Sample player data:", JSON.stringify(players[0], null, 2))
  }

  const { error: playersError } = await supabase.from("players").insert(players)

  if (playersError) {
    console.log("=== PLAYERS INSERT ERROR ===")
    console.log("Players error details:", JSON.stringify(playersError, null, 2))
    throw new Error(`Failed to insert players: ${playersError.message}`)
  }

  console.log("=== INSERT SUCCESS ===")
  console.log(`Tournament ID: ${tournamentId}`)
  console.log(`Players inserted: ${players.length}`)

  return {
    tournament_id: tournamentId,
    players_inserted: players.length,
  }
}
