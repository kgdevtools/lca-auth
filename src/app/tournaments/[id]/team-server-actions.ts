"use server"

import { createClient } from "@/utils/supabase/server"
import type { Team, TeamPlayer, BoardPairing, TeamPairing } from "@/types/database"

export interface TeamWithPlayers extends Team {
  team_players: TeamPlayer[]
}

export interface TeamStandingsData {
  teams: TeamWithPlayers[]
  totalRounds: number
}

export interface PlayerPerformance extends TeamPlayer {
  team_name: string
  rounds: {
    round_number: number
    opponent_name: string
    opponent_rating: number | null
    result: string
    color: "W" | "B"
    board_number: number
  }[]
}

export interface TeamTournamentDetails {
  standings: TeamStandingsData
  playerStats: PlayerPerformance[]
}

/**
 * Fetch complete team tournament details including team standings and individual player stats
 */
export async function getTeamTournamentDetails(
  tournamentId: string
): Promise<TeamTournamentDetails> {
  const supabase = await createClient()

  // Step 1: Get all teams for this tournament with their players
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(`
      *,
      team_players (*)
    `)
    .eq("team_tournament_id", tournamentId)
    .order("rank", { ascending: true, nullsFirst: false })

  if (teamsError) {
    console.error("Error fetching teams:", teamsError)
    throw new Error(`Failed to fetch teams: ${teamsError.message}`)
  }

  // Step 2: Get tournament rounds count
  const { data: rounds, error: roundsError } = await supabase
    .from("team_rounds")
    .select("round_number")
    .eq("team_tournament_id", tournamentId)
    .order("round_number", { ascending: true })

  if (roundsError) {
    console.error("Error fetching rounds:", roundsError)
    throw new Error(`Failed to fetch rounds: ${roundsError.message}`)
  }

  const totalRounds = rounds?.length || 0

  // Step 3: Build player performance data
  // Get all board pairings for this tournament
  const { data: boardPairings, error: boardError } = await supabase
    .from("board_pairings")
    .select(`
      *,
      team_pairing:team_pairings!inner (
        team_round:team_rounds!inner (
          round_number,
          team_tournament_id
        )
      )
    `)
    .eq("team_pairing.team_round.team_tournament_id", tournamentId)

  if (boardError) {
    console.error("Error fetching board pairings:", boardError)
  }

  // Build player performance map with board number calculation
  const playerPerformanceMap = new Map<string, PlayerPerformance>()
  const playerBoardCounts = new Map<string, Map<number, number>>() // player_id -> board_number -> count

  // Initialize all players
  teams?.forEach((team: any) => {
    team.team_players?.forEach((player: any) => {
      playerPerformanceMap.set(player.id, {
        ...player,
        team_name: team.team_name,
        rounds: [],
      })
      playerBoardCounts.set(player.id, new Map())
    })
  })

  // Add round-by-round performance and track board usage
  boardPairings?.forEach((board: any) => {
    const roundNumber = board.team_pairing.team_round.round_number

    // Add white player's game
    if (board.white_player_id) {
      const whitePlayer = playerPerformanceMap.get(board.white_player_id)
      if (whitePlayer && board.black_player_id) {
        // Find black player name
        const blackPlayer = Array.from(playerPerformanceMap.values()).find(
          (p) => p.id === board.black_player_id
        )
        whitePlayer.rounds.push({
          round_number: roundNumber,
          opponent_name: blackPlayer?.player_name || "Unknown",
          opponent_rating: board.black_rating,
          result: board.white_result,
          color: "W",
          board_number: board.board_number,
        })

        // Track board usage
        const boardCounts = playerBoardCounts.get(board.white_player_id)!
        boardCounts.set(board.board_number, (boardCounts.get(board.board_number) || 0) + 1)
      }
    }

    // Add black player's game
    if (board.black_player_id) {
      const blackPlayer = playerPerformanceMap.get(board.black_player_id)
      if (blackPlayer && board.white_player_id) {
        // Find white player name
        const whitePlayer = Array.from(playerPerformanceMap.values()).find(
          (p) => p.id === board.white_player_id
        )
        blackPlayer.rounds.push({
          round_number: roundNumber,
          opponent_name: whitePlayer?.player_name || "Unknown",
          opponent_rating: board.white_rating,
          result: board.black_result,
          color: "B",
          board_number: board.board_number,
        })

        // Track board usage
        const boardCounts = playerBoardCounts.get(board.black_player_id)!
        boardCounts.set(board.board_number, (boardCounts.get(board.board_number) || 0) + 1)
      }
    }
  })

  // Calculate most common board for each player
  playerPerformanceMap.forEach((player, playerId) => {
    // Find most common board
    const boardCounts = playerBoardCounts.get(playerId)!
    let mostCommonBoard: number | null = null
    let maxCount = 0

    boardCounts.forEach((count, boardNum) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonBoard = boardNum
      }
    })

    // Update player with calculated board number
    player.board_number = mostCommonBoard
    // Performance rating will be updated later - set to null for now
    player.performance_rating = null

    // Sort rounds
    player.rounds.sort((a, b) => a.round_number - b.round_number)
  })

  const playerStats = Array.from(playerPerformanceMap.values()).sort((a, b) => {
    // Sort by team rank first, then by points
    const teamA = teams?.find((t) => t.id === a.team_id)
    const teamB = teams?.find((t) => t.id === b.team_id)
    const rankDiff = (teamA?.rank || 999) - (teamB?.rank || 999)
    if (rankDiff !== 0) return rankDiff
    return b.points - a.points
  })

  return {
    standings: {
      teams: (teams as TeamWithPlayers[]) || [],
      totalRounds,
    },
    playerStats,
  }
}
