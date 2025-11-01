'use server'

import { createClient } from "@/utils/supabase/server"

export interface PlayerSearchResult {
  name: string
  unique_no: string | null
  rating: string | null
  fed: string | null
}

export interface MatchResult {
  exactMatch: string | null
  closeMatches: Array<{ name: string; unique_no: string | null }>
}

export interface ActivePlayerData {
  UNIQUE_NO: string | null
  SURNAME: string | null
  FIRSTNAME: string | null
  BDATE: string | null
  SEX: string | null
  TITLE: string | null
  RATING: string | null
  FED: string | null
  name: string | null
  player_rating: string | null
  tie_breaks: string | null
  performance_rating: string | null
  confidence: string | null
  classifications: string | null
  tournament_id: string | null
  tournament_name: string | null
  created_at: string | null
}

/**
 * Search for players in the active_players_august_2025_profiles table
 * Supports flexible matching for "Surname Name" or "Name Surname" variations
 */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  const supabase = await createClient()
  
  // Use ILIKE for case-insensitive search on the name column
  const { data, error } = await supabase
    .from('active_players_august_2025_profiles')
    .select('name, UNIQUE_NO, RATING, FED')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(50)

  if (error) {
    console.error('Error searching players:', error)
    return []
  }

  // Get unique player names (some players may appear multiple times due to different tournaments)
  const uniquePlayers = new Map<string, PlayerSearchResult>()
  
  if (data) {
    for (const player of data) {
      if (player.name && !uniquePlayers.has(player.name)) {
        uniquePlayers.set(player.name, {
          name: player.name,
          unique_no: player.UNIQUE_NO,
          rating: player.RATING,
          fed: player.FED,
        })
      }
    }
  }

  return Array.from(uniquePlayers.values()).slice(0, 10)
}

/**
 * Get all tournament data for a specific player from active_players_august_2025_profiles
 * Matches player name flexibly (handles "Surname Name" or "Name Surname" variations)
 */
export async function getActivePlayerData(playerName: string): Promise<ActivePlayerData[]> {
  if (!playerName) {
    return []
  }

  const supabase = await createClient()

  // Try multiple matching strategies to handle name variations
  const trimmedName = playerName.trim()

  // Strategy 1: Exact match (case-insensitive)
  let { data, error } = await supabase
    .from('active_players_august_2025_profiles')
    .select('*')
    .ilike('name', trimmedName)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active player data:', error)
    return []
  }

  // If exact match found, return it
  if (data && data.length > 0) {
    return data
  }

  // Strategy 2: Try reversing the name (handle "Surname Name" vs "Name Surname")
  const nameParts = trimmedName.split(/\s+/).filter(Boolean)
  if (nameParts.length >= 2) {
    // Try reversed name
    const reversedName = nameParts.reverse().join(' ')
    const { data: reversedData, error: reversedError } = await supabase
      .from('active_players_august_2025_profiles')
      .select('*')
      .ilike('name', reversedName)
      .order('created_at', { ascending: false })

    if (!reversedError && reversedData && reversedData.length > 0) {
      return reversedData
    }

    // Strategy 3: Partial match with wildcards (match if name contains all parts)
    const { data: partialData, error: partialError } = await supabase
      .from('active_players_august_2025_profiles')
      .select('*')
      .ilike('name', `%${nameParts[0]}%`)
      .ilike('name', `%${nameParts[nameParts.length - 1]}%`)
      .order('created_at', { ascending: false })

    if (!partialError && partialData && partialData.length > 0) {
      return partialData
    }
  }

  // Strategy 4: Fuzzy match with wildcards as last resort
  const { data: fuzzyData } = await supabase
    .from('active_players_august_2025_profiles')
    .select('*')
    .ilike('name', `%${trimmedName}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  return fuzzyData || []
}

/**
 * Find exact and close matches for a player name
 * Shows name variations (same person with different name spellings) as close matches
 */
export async function findPlayerMatches(playerName: string): Promise<MatchResult> {
  if (!playerName) {
    return { exactMatch: null, closeMatches: [] }
  }

  const supabase = await createClient()
  const trimmedName = playerName.trim()

  // Strategy 1: Try exact match (case-insensitive)
  let { data: exactData } = await supabase
    .from('active_players_august_2025_profiles')
    .select('name, UNIQUE_NO')
    .ilike('name', trimmedName)
    .limit(1)

  if (exactData && exactData.length > 0) {
    const exactUniqueNo = exactData[0].UNIQUE_NO
    const exactName = exactData[0].name
    const closeMatchesSet = new Map<string, { name: string; unique_no: string | null }>()

    // Find other name variations with the SAME UNIQUE_NO (same person, different spelling)
    const { data: samePersonData } = await supabase
      .from('active_players_august_2025_profiles')
      .select('name, UNIQUE_NO')
      .eq('UNIQUE_NO', exactUniqueNo)
      .neq('name', exactName)
      .limit(10)

    if (samePersonData) {
      samePersonData.forEach(row => {
        if (row.name && row.name.toLowerCase() !== exactName.toLowerCase()) {
          closeMatchesSet.set(row.name, {
            name: row.name,
            unique_no: row.UNIQUE_NO
          })
        }
      })
    }

    // Also find similar names (reversed, partial matches) with DIFFERENT UNIQUE_NO
    const nameParts = trimmedName.split(/\s+/).filter(Boolean)
    if (nameParts.length >= 2 && closeMatchesSet.size < 5) {
      // Try reversed name
      const reversedName = [...nameParts].reverse().join(' ')
      const { data: reversedData } = await supabase
        .from('active_players_august_2025_profiles')
        .select('name, UNIQUE_NO')
        .ilike('name', reversedName)
        .neq('UNIQUE_NO', exactUniqueNo)
        .limit(3)

      if (reversedData) {
        reversedData.forEach(row => {
          if (row.name && closeMatchesSet.size < 5) {
            closeMatchesSet.set(row.name, {
              name: row.name,
              unique_no: row.UNIQUE_NO
            })
          }
        })
      }

      // Try fuzzy match with name parts
      if (closeMatchesSet.size < 5) {
        const { data: fuzzyData } = await supabase
          .from('active_players_august_2025_profiles')
          .select('name, UNIQUE_NO')
          .ilike('name', `%${nameParts[0]}%`)
          .ilike('name', `%${nameParts[nameParts.length - 1]}%`)
          .neq('UNIQUE_NO', exactUniqueNo)
          .limit(5)

        if (fuzzyData) {
          fuzzyData.forEach(row => {
            if (row.name && closeMatchesSet.size < 5) {
              closeMatchesSet.set(row.name, {
                name: row.name,
                unique_no: row.UNIQUE_NO
              })
            }
          })
        }
      }
    }

    return {
      exactMatch: exactName,
      closeMatches: Array.from(closeMatchesSet.values()).slice(0, 5)
    }
  }

  // No exact match found - try to find close matches
  const nameParts = trimmedName.split(/\s+/).filter(Boolean)
  const closeMatchesSet = new Map<string, { name: string; unique_no: string | null }>()

  if (nameParts.length >= 2) {
    // Try reversed
    const reversedName = [...nameParts].reverse().join(' ')
    const { data: reversedData } = await supabase
      .from('active_players_august_2025_profiles')
      .select('name, UNIQUE_NO')
      .ilike('name', reversedName)
      .limit(5)

    if (reversedData) {
      reversedData.forEach(row => {
        if (row.name) {
          closeMatchesSet.set(row.name, {
            name: row.name,
            unique_no: row.UNIQUE_NO
          })
        }
      })
    }

    // Try fuzzy with name parts
    if (closeMatchesSet.size < 5) {
      const { data: fuzzyData } = await supabase
        .from('active_players_august_2025_profiles')
        .select('name, UNIQUE_NO')
        .ilike('name', `%${nameParts[0]}%`)
        .ilike('name', `%${nameParts[nameParts.length - 1]}%`)
        .limit(10)

      if (fuzzyData) {
        fuzzyData.forEach(row => {
          if (row.name && closeMatchesSet.size < 5) {
            closeMatchesSet.set(row.name, {
              name: row.name,
              unique_no: row.UNIQUE_NO
            })
          }
        })
      }
    }
  } else {
    // Single name - fuzzy search
    const { data: fuzzyData } = await supabase
      .from('active_players_august_2025_profiles')
      .select('name, UNIQUE_NO')
      .ilike('name', `%${trimmedName}%`)
      .limit(10)

    if (fuzzyData) {
      fuzzyData.forEach(row => {
        if (row.name && closeMatchesSet.size < 5) {
          closeMatchesSet.set(row.name, {
            name: row.name,
            unique_no: row.UNIQUE_NO
          })
        }
      })
    }
  }

  return {
    exactMatch: null,
    closeMatches: Array.from(closeMatchesSet.values()).slice(0, 5)
  }
}

/**
 * Get player statistics from active_players_august_2025_profiles
 * Uses the same flexible matching as getActivePlayerData
 */
export async function getPlayerStatistics(playerName: string) {
  if (!playerName) {
    return null
  }

  // Reuse the flexible matching logic from getActivePlayerData
  const data = await getActivePlayerData(playerName)

  if (!data || data.length === 0) {
    return null
  }

  // Calculate statistics
  const tournaments = new Set(data.map(d => d.tournament_name).filter(Boolean)).size
  const latestRating = data[0]?.RATING || data[0]?.player_rating || 'N/A'

  const ratings = data
    .map(d => parseInt(d.RATING || d.player_rating || '0'))
    .filter(r => r > 0)

  const highestRating = ratings.length > 0 ? Math.max(...ratings) : 0

  const performances = data
    .map(d => parseInt(d.performance_rating || '0'))
    .filter(p => p > 0)

  const avgPerformance = performances.length > 0
    ? Math.round(performances.reduce((a, b) => a + b, 0) / performances.length)
    : 0

  return {
    totalGames: data.length,
    tournaments,
    latestRating,
    highestRating: highestRating > 0 ? highestRating : 'N/A',
    avgPerformance: avgPerformance > 0 ? avgPerformance : 'N/A',
    chessaId: data[0]?.UNIQUE_NO || null,
    federation: data[0]?.FED || null,
  }
}
