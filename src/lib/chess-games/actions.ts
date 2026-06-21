// src/lib/chess-games/actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatTournamentName } from './utils'

// A game as the viewers consume it. `id` is the unified `games` uuid; `pgn` is the
// full original PGN (headers + moves) so the board + tag readers work unchanged.
export interface GameData {
  id: string;
  created_at: string;
  title: string;
  pgn: string;
}

// Tournament registry row (tournaments_meta). `id` is the uuid FK'd by games.
export interface TournamentMeta {
  id: string;
  name: string;          // slug/identifier (legacy table name)
  alias?: string;        // human-readable name
  created_at?: string;
  display_name?: string; // alias, or a prettified name
}

/** Tournaments from the registry, newest first. */
export async function listTournaments(): Promise<{ tournaments: TournamentMeta[], error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tournaments_meta')
    .select('id, name, alias, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading tournaments_meta:', error.message)
    return { tournaments: [], error: error.message }
  }

  const tournaments = (data || []).map((t) => ({
    ...t,
    display_name: t.alias || (typeof t.name === 'string' ? formatTournamentName(t.name) : t.name || t.id),
  })) as TournamentMeta[]

  return { tournaments, error: null }
}

/** All games for a tournament, from the unified `games` table (by tournament uuid). */
export async function fetchGames(tournamentId: string): Promise<{ games: GameData[], error: string | null }> {
  if (!tournamentId) return { games: [], error: 'No tournament specified.' };

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('games')
    .select('id, created_at, title, pgn, full_pgn, date, round')
    .eq('tournament_id', tournamentId)
    .order('date', { ascending: true, nullsFirst: false })
    .order('round', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Error fetching games for ${tournamentId}:`, error.message)
    return { games: [], error: error.message }
  }

  const games: GameData[] = (data || []).map((g: { id: string; created_at: string; title: string | null; pgn: string | null; full_pgn: string | null }) => ({
    id: String(g.id),
    created_at: g.created_at,
    title: g.title ?? '',
    // Prefer the lossless original; fall back to movetext if ever missing.
    pgn: g.full_pgn || g.pgn || '',
  }))

  return { games, error: null }
}

// A search hit: a game plus the columns needed to render + sort a flat result
// list. Extends GameData so it can be handed straight to the board playlist.
export interface GameSearchResult extends GameData {
  white_name: string | null;
  black_name: string | null;
  tournament_id: string | null;
  tournament_name: string | null;
  date: string | null;
  result: string | null;
}

export interface GameSearchFilters {
  /** ISO date (YYYY-MM-DD); keep games on/after this day. */
  dateFrom?: string;
  /** ISO date (YYYY-MM-DD); keep games on/before this day. */
  dateTo?: string;
}

/**
 * Fuzzy search across the unified `games` table by player name (White/Black) and
 * tournament name, with an optional date range. Matching is case-insensitive
 * substring (ILIKE), accelerated by the pg_trgm GIN indexes on those columns;
 * separators in the query (commas/parens) become wildcards so "Mabasa, Jack" and
 * "Mabasa Jack" both hit. Returns up to 200 games, newest first.
 */
export async function searchGames(
  query: string,
  filters: GameSearchFilters = {},
): Promise<{ results: GameSearchResult[]; error: string | null }> {
  const raw = (query || '').trim();
  const hasDate = !!(filters.dateFrom || filters.dateTo);
  // Need at least a 2-char term or a date filter — otherwise it's "everything".
  if (raw.length < 2 && !hasDate) return { results: [], error: null };

  const supabase = await createClient();
  let q = supabase
    .from('games')
    .select('id, created_at, title, pgn, full_pgn, white_name, black_name, tournament_id, tournament_name, date, result');

  if (raw.length >= 2) {
    // Turn or()-breaking chars into wildcards so the term stays a single pattern.
    const term = raw.replace(/[,()*]/g, '%');
    const like = `%${term}%`;
    q = q.or(`white_name.ilike.${like},black_name.ilike.${like},tournament_name.ilike.${like}`);
  }
  if (filters.dateFrom) q = q.gte('date', filters.dateFrom);
  if (filters.dateTo) q = q.lte('date', filters.dateTo);

  const { data, error } = await q
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error searching games:', error.message);
    return { results: [], error: error.message };
  }

  const results: GameSearchResult[] = (data || []).map((g: {
    id: string; created_at: string; title: string | null; pgn: string | null; full_pgn: string | null;
    white_name: string | null; black_name: string | null; tournament_id: string | null;
    tournament_name: string | null; date: string | null; result: string | null;
  }) => ({
    id: String(g.id),
    created_at: g.created_at,
    title: g.title ?? '',
    pgn: g.full_pgn || g.pgn || '',
    white_name: g.white_name,
    black_name: g.black_name,
    tournament_id: g.tournament_id,
    tournament_name: g.tournament_name,
    date: g.date,
    result: g.result,
  }));

  return { results, error: null };
}

/** Delete a game from the unified table. */
export async function deleteGame(gameId: string): Promise<{ success: boolean, error: string | null }> {
  if (!gameId) return { success: false, error: 'No game specified.' };

  const supabase = await createClient()

  const { error } = await supabase.from('games').delete().eq('id', gameId)
  if (error) {
    console.error(`Error deleting game ${gameId}:`, error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/chess-games')
  revalidatePath('/')
  revalidatePath('/add-game')
  return { success: true, error: null }
}

// ─── Write path (unified `games` + `tournaments_meta` registry) ─────────────────
// Adds/edits write to the one `games` table, extracting PGN headers into columns at
// write time (mirrors scripts/migrate-games.ts) and keeping `full_pgn` as the
// lossless original. "New tournament" is a plain registry insert — no runtime DDL.

/** Header→column extraction helpers (kept in sync with scripts/migrate-games.ts). */
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const re = /^\s*\[([^\s\]]+)\s+"([^"]*)"\]/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pgn)) !== null) headers[m[1]] = m[2];
  return headers;
}
/** Movetext only: strip the leading header block, keep comments/NAGs/variations. */
function movetextOf(pgn: string): string {
  return pgn.replace(/^(?:\[[^\]]+\][\r\n]*)+/i, '').trim();
}
function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
/** "2026.03.14" / "2026/03/14" → "2026-03-14"; null for unknown/"????.??.??". */
function toDate(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim().replace(/[./]/g, '-').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}
function clean(v: string | undefined): string | null {
  if (v == null) return null;
  const s = v.trim();
  return s && s !== '?' ? s : null;
}

/** Build the per-game column payload from a full PGN + display title. */
function gameColumns(fullPgn: string, title: string) {
  const h = parsePgnHeaders(fullPgn);
  return {
    location: clean(h.Site),
    date: toDate(h.Date) ?? toDate(h.UTCDate),
    round: toInt(h.Round),
    white_name: clean(h.White),
    black_name: clean(h.Black),
    white_elo: toInt(h.WhiteElo),
    black_elo: toInt(h.BlackElo),
    white_title: clean(h.WhiteTitle),
    black_title: clean(h.BlackTitle),
    result: clean(h.Result),
    eco: clean(h.ECO),
    opening: clean(h.Opening),
    time_control: clean(h.TimeControl),
    variant: clean(h.Variant),
    termination: clean(h.Termination),
    title: title.trim() || null,
    pgn: movetextOf(fullPgn),
    full_pgn: fullPgn,
  };
}

/** Resolve the current user, or an error string for the action to return. */
async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Slugify a display name into a registry identifier (legacy `name` column). */
function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63);
}

/** Create a tournament: a plain `tournaments_meta` insert (no DDL). Returns its uuid. */
export async function createTournament(
  name: string,
  alias?: string,
): Promise<{ success: boolean; id?: string; error: string | null }> {
  const display = (name || '').trim();
  if (!display) return { success: false, error: 'Tournament name is required.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to create a tournament.' };
  }

  const slug = slugify(display);
  if (!slug) return { success: false, error: 'Please use a name with letters or numbers.' };

  // Reject duplicate slugs so the registry stays unambiguous.
  const { data: existing } = await supabase.from('tournaments_meta').select('id').eq('name', slug).limit(1);
  if (existing && existing.length > 0) {
    return { success: false, error: `A tournament with id "${slug}" already exists.` };
  }

  const { data, error } = await supabase
    .from('tournaments_meta')
    .insert({ name: slug, alias: (alias || display).trim() })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating tournament:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, id: data.id as string, error: null };
}

/** Rename a tournament (registry row update; games keep their FK). */
export async function renameTournament(
  id: string,
  name: string,
  alias?: string,
): Promise<{ success: boolean; error: string | null }> {
  const display = (name || '').trim();
  if (!id) return { success: false, error: 'No tournament specified.' };
  if (!display) return { success: false, error: 'Tournament name is required.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to edit a tournament.' };
  }

  const newAlias = (alias || display).trim();
  const { error } = await supabase
    .from('tournaments_meta')
    .update({ alias: newAlias })
    .eq('id', id);

  if (error) {
    console.error('Error renaming tournament:', error.message);
    return { success: false, error: error.message };
  }

  // Keep denormalized game labels in step with the new alias.
  await supabase.from('games').update({ tournament_name: newAlias }).eq('tournament_id', id);

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, error: null };
}

/** Delete a tournament and its games (FK cascade on tournament_id). */
export async function deleteTournament(id: string): Promise<{ success: boolean; error: string | null }> {
  if (!id) return { success: false, error: 'No tournament specified.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to delete a tournament.' };
  }

  const { error } = await supabase.from('tournaments_meta').delete().eq('id', id);
  if (error) {
    console.error('Error deleting tournament:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, error: null };
}

/** Look up a tournament's denormalized display name for new game rows. */
async function tournamentDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('tournaments_meta')
    .select('name, alias')
    .eq('id', tournamentId)
    .single();
  if (!data) return null;
  return data.alias || (typeof data.name === 'string' ? formatTournamentName(data.name) : null);
}

/** Add one game to a tournament. `fullPgn` is the lossless original. */
export async function addGame(
  tournamentId: string,
  title: string,
  fullPgn: string,
): Promise<{ success: boolean; error: string | null }> {
  if (!tournamentId) return { success: false, error: 'Select a tournament first.' };
  if (!fullPgn.trim()) return { success: false, error: 'PGN data is required.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to add a game.' };
  }

  const tournament_name = await tournamentDisplayName(supabase, tournamentId);
  const { error } = await supabase.from('games').insert({
    tournament_id: tournamentId,
    tournament_name,
    ...gameColumns(fullPgn, title),
  });

  if (error) {
    console.error('Error adding game:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, error: null };
}

/** Batch-add games (each carries its own full PGN). */
export async function addMultipleGames(
  tournamentId: string,
  games: { title: string; pgn: string }[],
): Promise<{ success: boolean; count?: number; error: string | null }> {
  if (!tournamentId) return { success: false, error: 'Select a tournament first.' };
  const valid = (games || []).filter((g) => g.pgn && g.pgn.trim());
  if (valid.length === 0) return { success: false, error: 'No valid games to upload.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to add games.' };
  }

  const tournament_name = await tournamentDisplayName(supabase, tournamentId);
  const rows = valid.map((g) => ({
    tournament_id: tournamentId,
    tournament_name,
    ...gameColumns(g.pgn, g.title),
  }));

  const { error, count } = await supabase.from('games').insert(rows, { count: 'exact' });
  if (error) {
    console.error('Error batch-adding games:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, count: count ?? rows.length, error: null };
}

/** Edit a game's PGN + metadata (re-extracts columns; tournament unchanged). */
export async function editGame(
  gameId: string,
  title: string,
  fullPgn: string,
): Promise<{ success: boolean; error: string | null }> {
  if (!gameId) return { success: false, error: 'No game specified.' };
  if (!fullPgn.trim()) return { success: false, error: 'PGN data is required.' };

  const supabase = await createClient();
  if (!(await requireUser(supabase))) {
    return { success: false, error: 'You must be logged in to edit a game.' };
  }

  const { error } = await supabase
    .from('games')
    .update(gameColumns(fullPgn, title))
    .eq('id', gameId);

  if (error) {
    console.error('Error editing game:', error.message);
    return { success: false, error: error.message };
  }

  revalidatePath('/add-game');
  revalidatePath('/chess-games')
  revalidatePath('/');
  return { success: true, error: null };
}
