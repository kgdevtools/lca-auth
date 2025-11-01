// src/app/add-game/action.ts

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { TournamentId } from './config';

// --- TYPE DEFINITIONS ---
export interface GameData {
  id: string;
  created_at?: string | null;
  title: string;
  pgn: string;
}

export interface FormState {
  message: string;
  error: boolean;
}

export interface TournamentMeta {
  id: string;   // UUID in tournaments_meta
  name: string; // Table name for the tournament (e.g., "capricorn_qualifying_tournament_4_2025_u14_games")
}

// --- HELPERS ---
function normalizeTournamentId(input: string): string {
  let id = (input || '').toLowerCase().trim();
  id = id.replace(/[^a-z0-9]+/g, '_'); // non-alnum -> underscore
  id = id.replace(/_+/g, '_').replace(/^_+|_+$/g, ''); // collapse and trim underscores
  if (!id.endsWith('_games')) id = `${id}_games`;
  if (id.length > 63) id = id.slice(0, 63); // PostgreSQL identifier limit
  return id;
}

// --- SERVER ACTIONS ---

/**
 * Lists tournaments from the tournaments_meta table (id uuid, name table_name).
 * name is the actual table name to query for games.
 */
export async function listTournaments(): Promise<{ tournaments: TournamentMeta[]; error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { tournaments: [], error: 'Authentication required to list tournaments.' };
  }

  const { data, error } = await supabase
    .from('tournaments_meta')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error loading tournaments_meta:', error.message);
    return { tournaments: [], error: error.message };
  }

  return { tournaments: (data || []) as TournamentMeta[], error: null };
}

/**
 * Creates a new tournament: normalizes a name to a safe table ID, creates the table via RPC,
 * and (RPC) upserts into tournaments_meta with name = table name.
 *
 * The RPC "public.create_tournament(raw_name text, display_name text)" must exist and:
 * - Create table with columns (id uuid default gen_random_uuid() primary key, created_at timestamptz default now(), title text, pgn jsonb)
 * - Enable RLS and grant select/insert/delete to authenticated
 * - Insert into public.tournaments_meta (id uuid generated inside the function, name text = table name)
 */
export async function createTournament(
  name: string
): Promise<{ success: boolean; id?: string; error: string | null }> {
  const supabase = await createClient();

  const displayName = (name || '').trim();
  if (!displayName) {
    return { success: false, error: 'Tournament Name is required.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required to create a tournament.' };
  }

  // Validate the preview id
  const previewId = normalizeTournamentId(displayName);
  const tableNameRegex = /^[a-z0-9_]+$/;
  if (!tableNameRegex.test(previewId)) {
    return { success: false, error: 'The generated Tournament ID is invalid. Please use a simpler name.' };
  }

  // RPC call to create table + upsert meta
  const { data, error } = await supabase.rpc('create_tournament', {
    raw_name: displayName,
    display_name: displayName,
  });

  if (error) {
    console.error('RPC create_tournament error:', error.message);
    return { success: false, error: `Database error: ${error.message}` };
  }

  // RPC returns table id (safe table name) and created boolean
  const createdRow = Array.isArray(data) ? data[0] : data;
  const createdId: string | undefined = createdRow?.id;      // table name
  const created: boolean | undefined = createdRow?.created;  // boolean

  if (!createdId) {
    return { success: false, error: 'Unexpected response from database.' };
  }

  if (created === false) {
    return { success: false, id: createdId, error: `A tournament with ID '${createdId}' already exists.` };
  }

  revalidatePath('/add-game');
  return { success: true, id: createdId, error: null };
}

/**
 * Adds a new game to the specified tournament table.
 * tableName must be the actual table name (tournaments_meta.name).
 */
export async function addGameToDB(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const title = (formData.get('title') as string) || '';
  const pgn = (formData.get('pgn') as string) || '';
  const tableName = formData.get('tableName') as TournamentId; // the table name

  if (!tableName) {
    return { message: 'Tournament must be selected.', error: true };
  }
  if (!title.trim()) {
    return { message: 'Title is required.', error: true };
  }
  if (!pgn.trim()) {
    return { message: 'Cannot add an empty game. PGN data is required.', error: true };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Authentication required to add a game.', error: true };
  }

  // pgn column is jsonb; storing a plain string is valid (JSON string)
  const { error } = await supabase.from(tableName).insert([{ title, pgn }]);
  if (error) {
    console.error(`Supabase insert error in table ${tableName}:`, error.message);
    return { message: `Database error: ${error.message}`, error: true };
  }

  revalidatePath('/add-game');
  return { message: 'Game successfully added!', error: false };
}

/**
 * Fetches all games from a specific tournament table (by name).
 * Works whether the table has created_at or not.
 */
export async function fetchGames(tableName: TournamentId): Promise<{ games: GameData[]; error: string | null }> {
  if (!tableName) {
    return { games: [], error: "No tournament specified." };
  }
  
  const supabase = await createClient();

  // Select all columns to be resilient to table variations
  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`Error fetching games from ${tableName}:`, error.message);
    return { games: [], error: error.message };
  }
  
  const processedGames: GameData[] = (data || []).map((row: any) => ({
    id: String(row.id),
    created_at: row.created_at ?? null,
    title: row.title ?? '',
    pgn: typeof row.pgn === 'string' ? row.pgn : JSON.stringify(row.pgn),
  }));

  // Sort by created_at if present
  processedGames.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });

  return { games: processedGames, error: null };
}

/**
 * Deletes a game from a specific tournament table.
 */
export async function deleteGame(id: string, tableName: TournamentId): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required to delete a game.' };
  }

  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) {
    console.error(`Error deleting game from ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  return { success: true, error: null };
}