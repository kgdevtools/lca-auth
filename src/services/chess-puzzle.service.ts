'use server';

import { createClient } from '@/utils/supabase/server';

// --- TYPE DEFINITION ---
// Based on your 'chess_puzzles' table schema
export interface PuzzleData {
  id: number;
  created_at: string;
  fen: string;
  solution: string; // e.g., "e4 e5 Nf3 Nc6"
  description: string | null;
  explanation: string | null;
}

// --- SERVICE FUNCTIONS ---

/**
 * Fetches all chess puzzles from the database, ordered by creation date.
 */
export async function fetchPuzzles(): Promise<{ puzzles: PuzzleData[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chess_puzzles')
    .select('*')
    .order('created_at', { ascending: true }); // Or however you wish to order them

  if (error) {
    console.error('Error fetching puzzles:', error.message);
    return { puzzles: [], error: error.message };
  }

  // Ensure solution is a clean string, handling potential nulls
  const cleanedData = data.map(p => ({
    ...p,
    solution: p.solution || '',
  }));

  return { puzzles: cleanedData, error: null };
}
