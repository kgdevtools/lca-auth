// src/services/gameService.ts

import { createClient } from '@/utils/supabase/server'

// Define the type for our game data, can be shared across the app
export interface GameData {
  id: number;
  created_at: string;
  title: string;
  pgn: string;
}

// Function to fetch all games from the database
export async function fetchTournamentGames(): Promise<{ games: GameData[], error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lca_launch_open_2025_games')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching games:', error)
    return { games: [], error: error.message }
  }

  // Ensure the data conforms to the GameData interface
  const games: GameData[] = data || []
  return { games, error: null }
}