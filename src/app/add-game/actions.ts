'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// --- TYPE DEFINITIONS ---

/**
 * Represents the structure of a game record in the database.
 */
export interface GameData {
  id: number;
  created_at: string;
  title: string;
  pgn: string;
}

/**
 * Defines the state for form submissions, containing a message and an error flag.
 */
export interface FormState {
  message: string;
  error: boolean;
}

// --- SERVER ACTIONS ---

/**
 * Adds a new game to the database.
 * @param prevState - The previous state of the form (unused in this implementation but required by useFormState).
 * @param formData - The form data containing the game's title and PGN.
 * @returns A promise that resolves to a new FormState object indicating success or failure.
 */
export async function addGameToDB(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const title = formData.get('title') as string;
  const pgn = formData.get('pgn') as string;

  if (!title?.trim()) {
    return { message: 'Title is required.', error: true };
  }
  if (!pgn?.trim()) {
    return { message: 'Cannot add an empty game. PGN data is required.', error: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Authentication required to add a game.', error: true };
  }

  const { error } = await supabase.from('tournament-games').insert([{ title, pgn }]);
  if (error) {
    console.error('Supabase insert error:', error.message);
    return { message: `Database error: ${error.message}`, error: true };
  }

  revalidatePath('/add-game');
  return { message: 'Game successfully added!', error: false };
}

/**
 * Fetches all tournament games from the database, ordered by most recent.
 * @returns A promise that resolves to an object containing the games list or an error message.
 */
export async function fetchGames(): Promise<{ games: GameData[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tournament-games')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error.message);
    return { games: [], error: error.message };
  }

  return { games: data as GameData[], error: null };
}

/**
 * Deletes a game from the database by its ID.
 * @param id - The unique identifier of the game to delete.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteGame(id: number): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required to delete a game.' };
  }

  const { error } = await supabase.from('tournament-games').delete().eq('id', id);
  if (error) {
    console.error('Error deleting game:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  return { success: true, error: null };
}

