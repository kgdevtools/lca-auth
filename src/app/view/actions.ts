// src/app/view/actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { TOURNAMENTS, type TournamentId } from './config'

// Define the type for our game data
export interface GameData {
  id: number;
  created_at: string;
  title: string;
  pgn: string;
}

// Function to fetch all games from a specific tournament table
export async function fetchGames(tableName: TournamentId): Promise<{ games: GameData[], error: string | null }> {
  // Validate tableName against the allowlist
  const isValidTable = TOURNAMENTS.some(t => t.id === tableName);
  if (!isValidTable) {
    return { games: [], error: 'Invalid tournament specified.' };
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from(tableName)
    .select('id, created_at, title, pgn')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching games from ${tableName}:`, error)
    return { games: [], error: error.message }
  }

  // Ensure PGN is always a string, handling cases where it might be null or an object (from a JSON column).
  const processedGames: GameData[] = (data || []).map(game => {
    let pgnString = '';
    if (game.pgn) {
      // If the DB column is JSON, Supabase might return a JS object.
      // We must ensure it's a string for chess.js.
      pgnString = typeof game.pgn === 'string' ? game.pgn : JSON.stringify(game.pgn);
    }
    return {
      ...game,
      pgn: pgnString,
    };
  });
  
  return { games: processedGames, error: null }
}

// Function to delete a game from a specific tournament table
export async function deleteGame(gameId: number, tableName: TournamentId): Promise<{ success: boolean, error: string | null }> {
  const isValidTable = TOURNAMENTS.some(t => t.id === tableName);
  if (!isValidTable) {
    return { success: false, error: 'Invalid tournament specified.' };
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', gameId)

  if (error) {
    console.error(`Error deleting game from ${tableName}:`, error)
    return { success: false, error: error.message }
  }

  revalidatePath('/view')
  return { success: true, error: null }
}