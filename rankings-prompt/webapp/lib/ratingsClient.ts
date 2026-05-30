/**
 * Dedicated READ-ONLY Supabase client for the chess-ratings project.
 *
 * Drop this into your web app's `lib/` folder. It is separate from any existing
 * Supabase client in the app — distinct env var names, anon key only.
 *
 * Required env (browser-readable, anon key — NEVER the service key):
 *   NEXT_PUBLIC_RATINGS_SUPABASE_URL
 *   NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY
 *
 * DB side (run once in the ratings project SQL editor):
 *   GRANT SELECT ON public.rs_local_active_players, public.sd_tournaments TO anon;
 */
import { createClient } from '@supabase/supabase-js';
import type { RawTournament, RawViewRow } from './rankings';

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
  // eslint-disable-next-line no-constant-condition
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
  'tournament_id, rank, name, name_sorted, federation, tournament_rating, ' +
  'points, performance_rating, match_score, rs_player_id, unique_no, ' +
  'fide_id, title, sex, fide_rating, current_rating, birth_year';

/**
 * Fetch the two DB sources for the rankings page. The region mapping
 * (tournament-regions.json) is a static file you bundle into the app — import it
 * separately and pass it to rankPlayers().
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
