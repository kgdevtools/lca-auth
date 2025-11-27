import { createClient } from "@/utils/supabase/server"
import type { TeamRoundData } from "@/services/teamTournamentParser"

export interface SaveTeamRoundResult {
  tournament_id: string
  round_number: number
  pairings_inserted: number
  boards_inserted: number
}

/**
 * Save a parsed team tournament round to the database
 * Handles tournament creation/lookup, team creation/lookup, and all nested data
 */
export async function saveTeamTournamentRound(
  data: TeamRoundData
): Promise<SaveTeamRoundResult> {
  const supabase = await createClient()

  console.log("=== SAVING TEAM TOURNAMENT ROUND ===")
  console.log("Tournament:", data.tournament_metadata.tournament_name)
  console.log("Round:", data.tournament_metadata.round_number)
  console.log("Team pairings:", data.team_pairings.length)

  // Start transaction-like operation
  try {
    // Step 1: Get or create tournament
    const tournamentId = await getOrCreateTournament(supabase, data)
    console.log("Tournament ID:", tournamentId)

    // Step 2: Check if this round already exists
    const roundNumber = data.tournament_metadata.round_number!
    const { data: existingRound } = await supabase
      .from("team_rounds")
      .select("id")
      .eq("team_tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .single()

    if (existingRound) {
      throw new Error(
        `Round ${roundNumber} already exists for this tournament. Delete it first to re-upload.`
      )
    }

    // Step 3: Create round record
    const { data: roundRecord, error: roundError } = await supabase
      .from("team_rounds")
      .insert({
        team_tournament_id: tournamentId,
        round_number: roundNumber,
        round_date: data.tournament_metadata.round_date || null,
        source_file: data.tournament_metadata.tournament_name || null
      })
      .select("id")
      .single()

    if (roundError || !roundRecord) {
      console.error("Round insert error:", roundError)
      throw new Error(`Failed to create round: ${roundError?.message}`)
    }

    const roundId = roundRecord.id
    console.log("Round ID:", roundId)

    // Step 4: Process each team pairing
    let totalPairingsInserted = 0
    let totalBoardsInserted = 0

    for (const pairing of data.team_pairings) {
      // Get or create teams
      const whiteTeamId = await getOrCreateTeam(
        supabase,
        tournamentId,
        pairing.team_white
      )
      const blackTeamId = await getOrCreateTeam(
        supabase,
        tournamentId,
        pairing.team_black
      )

      // Create team pairing
      const { data: pairingRecord, error: pairingError } = await supabase
        .from("team_pairings")
        .insert({
          team_round_id: roundId,
          pairing_number: pairing.pairing_number,
          team_white_id: whiteTeamId,
          team_black_id: blackTeamId,
          team_white_score: pairing.team_white_score,
          team_black_score: pairing.team_black_score,
          is_forfeit: pairing.is_forfeit
        })
        .select("id")
        .single()

      if (pairingError || !pairingRecord) {
        console.error("Pairing insert error:", pairingError)
        throw new Error(`Failed to create pairing: ${pairingError?.message}`)
      }

      totalPairingsInserted++

      // Create board pairings and link players
      for (const board of pairing.board_pairings) {
        // Get or create players (only if not forfeited)
        let whitePlayerId: string | null = null
        let blackPlayerId: string | null = null

        if (board.white_player) {
          whitePlayerId = await getOrCreatePlayer(
            supabase,
            whiteTeamId,
            board.white_player,
            board.white_rating,
            board.white_title
          )
        }

        if (board.black_player) {
          blackPlayerId = await getOrCreatePlayer(
            supabase,
            blackTeamId,
            board.black_player,
            board.black_rating,
            board.black_title
          )
        }

        // Insert board pairing
        const { error: boardError } = await supabase
          .from("board_pairings")
          .insert({
            team_pairing_id: pairingRecord.id,
            board_number: board.board_number,
            white_player_id: whitePlayerId,
            black_player_id: blackPlayerId,
            white_rating: board.white_rating,
            black_rating: board.black_rating,
            result: board.result,
            white_score: board.white_score,
            black_score: board.black_score,
            white_result: board.white_result,
            black_result: board.black_result
          })

        if (boardError) {
          console.error("Board pairing insert error:", boardError)
          throw new Error(`Failed to create board pairing: ${boardError.message}`)
        }

        totalBoardsInserted++

        // Update player statistics
        if (whitePlayerId) {
          await updatePlayerStats(supabase, whitePlayerId, board.white_score)
        }
        if (blackPlayerId) {
          await updatePlayerStats(supabase, blackPlayerId, board.black_score)
        }
      }
    }

    // Step 5: Update tournament round count
    await supabase
      .from("team_tournaments")
      .update({
        rounds: roundNumber // Store highest round number
      })
      .eq("id", tournamentId)

    // Step 6: Recalculate team standings
    await calculateTeamStandings(supabase, tournamentId)

    console.log("=== SAVE COMPLETE ===")
    console.log(`Inserted ${totalPairingsInserted} pairings, ${totalBoardsInserted} boards`)

    return {
      tournament_id: tournamentId,
      round_number: roundNumber,
      pairings_inserted: totalPairingsInserted,
      boards_inserted: totalBoardsInserted
    }
  } catch (error) {
    console.error("Save error:", error)
    throw error
  }
}

/**
 * Get existing tournament or create new one
 */
async function getOrCreateTournament(
  supabase: any,
  data: TeamRoundData
): Promise<string> {
  const tournamentName = data.tournament_metadata.tournament_name!

  // Try to find existing tournament by name
  const { data: existing } = await supabase
    .from("team_tournaments")
    .select("id")
    .eq("tournament_name", tournamentName)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new tournament
  const { data: newTournament, error } = await supabase
    .from("team_tournaments")
    .insert({
      tournament_name: tournamentName,
      organizer: data.tournament_metadata.organizer || null,
      chief_arbiter: data.tournament_metadata.chief_arbiter || null,
      deputy_chief_arbiter: data.tournament_metadata.deputy_chief_arbiter || null,
      tournament_director: data.tournament_metadata.tournament_director || null,
      arbiter: data.tournament_metadata.arbiter || null,
      location: data.tournament_metadata.location || null,
      date: data.tournament_metadata.date || null,
      rounds: 0,
      tournament_type: "Team"
    })
    .select("id")
    .single()

  if (error || !newTournament) {
    throw new Error(`Failed to create tournament: ${error?.message}`)
  }

  return newTournament.id
}

/**
 * Get existing team or create new one
 */
async function getOrCreateTeam(
  supabase: any,
  tournamentId: string,
  teamName: string
): Promise<string> {
  // Try to find existing team
  const { data: existing } = await supabase
    .from("teams")
    .select("id")
    .eq("team_tournament_id", tournamentId)
    .eq("team_name", teamName)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new team
  const { data: newTeam, error } = await supabase
    .from("teams")
    .insert({
      team_tournament_id: tournamentId,
      team_name: teamName,
      match_points: 0,
      game_points: 0,
      tie_breaks: {}
    })
    .select("id")
    .single()

  if (error || !newTeam) {
    throw new Error(`Failed to create team: ${error?.message}`)
  }

  return newTeam.id
}

/**
 * Get existing player or create new one
 */
async function getOrCreatePlayer(
  supabase: any,
  teamId: string,
  playerName: string,
  rating: number | null,
  title?: string
): Promise<string> {
  // Try to find existing player
  const { data: existing } = await supabase
    .from("team_players")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_name", playerName)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new player
  const { data: newPlayer, error } = await supabase
    .from("team_players")
    .insert({
      team_id: teamId,
      player_name: playerName,
      rating: rating,
      title: title || null,
      games_played: 0,
      points: 0
    })
    .select("id")
    .single()

  if (error || !newPlayer) {
    throw new Error(`Failed to create player: ${error?.message}`)
  }

  return newPlayer.id
}

/**
 * Update player statistics after a game
 */
async function updatePlayerStats(
  supabase: any,
  playerId: string,
  scoreEarned: number
): Promise<void> {
  // Increment games played and points
  const { error } = await supabase.rpc("increment_player_stats", {
    player_id: playerId,
    score: scoreEarned
  })

  // If RPC doesn't exist, fall back to manual update
  if (error) {
    const { data: player } = await supabase
      .from("team_players")
      .select("games_played, points")
      .eq("id", playerId)
      .single()

    if (player) {
      await supabase
        .from("team_players")
        .update({
          games_played: player.games_played + 1,
          points: player.points + scoreEarned
        })
        .eq("id", playerId)
    }
  }
}

/**
 * Recalculate team standings after a round is added
 */
async function calculateTeamStandings(
  supabase: any,
  tournamentId: string
): Promise<void> {
  console.log("Calculating team standings...")

  // Call the SQL function to recalculate
  const { error } = await supabase.rpc("calculate_team_statistics", {
    tournament_id: tournamentId
  })

  if (error) {
    console.error("Error calculating standings:", error)
    // Don't throw - this is not critical to the upload
  } else {
    console.log("Team standings updated successfully")
  }
}
