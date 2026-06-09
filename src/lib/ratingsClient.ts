/**
 * Dedicated READ-ONLY Supabase client for the chess-ratings project.
 *
 * Separate from this app's own Supabase client (src/utils/supabase): distinct env
 * var names, anon key only.
 *
 * Required env (browser-readable, anon key — NEVER the service key):
 *   NEXT_PUBLIC_RATINGS_SUPABASE_URL
 *   NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY
 *
 * DB side (run once in the ratings project SQL editor):
 *   GRANT SELECT ON public.rs_local_active_players, public.sd_tournaments TO anon;
 */
import { createClient } from '@supabase/supabase-js';
import type {
  RawRosterRow,
  RawTournament,
  RawTournamentMeta,
  RawViewRow,
} from './rankings';

const url = process.env.NEXT_PUBLIC_RATINGS_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_RATINGS_SUPABASE_URL / NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY',
  );
}

export const ratings = createClient(url, anonKey, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;

/** Paginate a select past PostgREST's 1000-row cap. */
async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await ratings
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

const VIEW_COLUMNS =
  'tournament_id, rank, name, name_sorted, federation, federations, tournament_rating, ' +
  'points, performance_rating, match_score, rs_player_id, unique_no, ' +
  'fide_id, title, sex, fide_rating, current_rating, birth_year';

/**
 * Fetch the two DB sources for the rankings page. The region mapping
 * (tournament-regions.json) is a static file bundled into the app — imported
 * separately and passed to rankPlayers().
 */
export async function fetchRankingData(): Promise<{
  appearances: RawViewRow[];
  tournaments: RawTournament[];
}> {
  const [appearances, tournaments] = await Promise.all([
    fetchAll<RawViewRow>('rs_local_active_players', VIEW_COLUMNS),
    fetchAll<RawTournament>('sd_tournaments', 'id, tournament_name, date'),
  ]);
  return { appearances, tournaments };
}

const ROSTER_COLUMNS =
  'tournament_id, rank, name, federation, tournament_rating, points, rounds';

/**
 * Full roster (every player) for the given tournaments, read from
 * `rs_local_active_players` — the same anon-readable view the rankings use, which
 * also carries the parsed `rounds` tokens. Used by the player profile to resolve
 * round tokens to real opponents by final-standings `rank`. (We deliberately do NOT
 * read the base `sd_players` table: RLS there returns zero rows to anon.) Paginates
 * past the 1000-row cap; ordered so pages are stable.
 */
export async function fetchTournamentPlayers(
  tournamentIds: string[],
): Promise<RawRosterRow[]> {
  const ids = [...new Set(tournamentIds)].filter(Boolean);
  if (ids.length === 0) return [];

  const out: RawRosterRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await ratings
      .from('rs_local_active_players')
      .select(ROSTER_COLUMNS)
      .in('tournament_id', ids)
      .order('tournament_id', { ascending: true })
      .order('rank', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`rs_local_active_players roster: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as RawRosterRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

/**
 * Per-tournament metadata (location + arbiters) for the profile's Tournaments tab.
 * Reads `sd_tournaments` (anon-readable). Best-effort: callers tolerate an empty result.
 */
export async function fetchTournamentMeta(
  tournamentIds: string[],
): Promise<RawTournamentMeta[]> {
  const ids = [...new Set(tournamentIds)].filter(Boolean);
  if (ids.length === 0) return [];
  const { data, error } = await ratings
    .from('sd_tournaments')
    .select('id, location, chief_arbiter, arbiter')
    .in('id', ids);
  if (error) throw new Error(`sd_tournaments meta: ${error.message}`);
  return (data ?? []) as unknown as RawTournamentMeta[];
}
