// src/app/view/actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { STATIC_TOURNAMENTS, type TournamentId } from './config'
import { formatTournamentName } from './utils'

// Define the type for our game data
export interface GameData {
  id: number;
  created_at: string;
  title: string;
  pgn: string;
}

// Define the type for tournament metadata
export interface TournamentMeta {
  id: string;      // UUID in tournaments_meta
  name: string;    // Table name for the tournament
  alias?: string;  // Human-readable alias for the tournament (e.g., "CDC Tournament 1 2025")
  created_at?: string; // Timestamp when tournament was created
  display_name?: string; // Formatted display name
}

// Function to fetch tournaments from tournaments_meta table
export async function listTournaments(): Promise<{ tournaments: TournamentMeta[], error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tournaments_meta')
    .select('id, name, alias, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading tournaments_meta:', error.message)
    // Return static tournaments as fallback
    return {
      tournaments: STATIC_TOURNAMENTS.map(t => ({
        id: t.id,
        name: t.name,
        display_name: formatTournamentName(t.name)
      })),
      error: null
    }
  }

  // Merge dynamic tournaments with static ones (deduplicate by name)
  const dynamicTournaments = (data || []).map(t => ({
    ...t,
    display_name: t.alias || (typeof t.name === 'string' ? formatTournamentName(t.name) : (t.alias || t.name || t.id || 'Unknown'))
  })) as TournamentMeta[]

  const allTournaments = [...dynamicTournaments]

  // Add static tournaments that aren't already in the dynamic list
  STATIC_TOURNAMENTS.forEach(staticT => {
    if (!allTournaments.some(t => t.name === staticT.id)) {
      allTournaments.push({
        id: staticT.id,
        name: staticT.id,
        display_name: formatTournamentName(staticT.id)
      })
    }
  })

  return { tournaments: allTournaments, error: null }
}

// Function to fetch all games from a specific tournament table
export async function fetchGames(tableName: TournamentId): Promise<{ games: GameData[], error: string | null }> {
  // Basic validation: ensure tableName is safe (alphanumeric and underscores only)
  const tableNameRegex = /^[a-z0-9_]+$/;
  if (!tableName || !tableNameRegex.test(tableName)) {
    return { games: [], error: 'Invalid tournament table name.' };
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
  // Basic validation: ensure tableName is safe (alphanumeric and underscores only)
  const tableNameRegex = /^[a-z0-9_]+$/;
  if (!tableName || !tableNameRegex.test(tableName)) {
    return { success: false, error: 'Invalid tournament table name.' };
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