// src/app/game-view/actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Define the type for our game data
export interface GameData {
  id: number;
  created_at: string;
  title: string;
  pgn: string;
}

// Function to fetch all games from the database
export async function fetchGames(): Promise<{ games: GameData[], error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tournament-games')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching games:', error)
    return { games: [], error: error.message }
  }

  return { games: data || [], error: null }
}

// Function to delete a game from the database
export async function deleteGame(gameId: number): Promise<{ success: boolean, error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournament-games')
    .delete()
    .eq('id', gameId)

  if (error) {
    console.error('Error deleting game:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/game-view')
  return { success: true, error: null }
}
