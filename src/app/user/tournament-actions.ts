'use server'

import { createClient } from "@/utils/supabase/server"

export interface PlayerSearchResult {
  name: string
  unique_no: string | null
  rating: string | null
  fed: string | null
}

export interface PlayerTournamentData {
  unique_no: string | null
  surname: string | null
  firstname: string | null
  bdate: string | null
  sex: string | null
  title: string | null
  rating: string | null
  fed: string | null
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

export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('search_player_names', { search_query: query })

  if (error) {
    console.error('Error searching players:', error)
    return []
  }

  return data || []
}

export async function getPlayerTournamentData(playerName: string): Promise<PlayerTournamentData[]> {
  if (!playerName) {
    return []
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('get_player_tournament_data', { player_name: playerName })

  if (error) {
    console.error('Error fetching tournament data:', error)
    return []
  }

  return data || []
}