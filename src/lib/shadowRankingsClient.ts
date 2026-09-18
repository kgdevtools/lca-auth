import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { RawTournament, RawViewRow } from "./rankings"

const url = process.env.NEXT_PUBLIC_RATINGS_SUPABASE_URL
const serviceKey = process.env.RATINGS_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_RATINGS_SUPABASE_URL / RATINGS_SUPABASE_SERVICE_ROLE_KEY",
  )
}

const ratingsServer = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PAGE_SIZE = 1000
const VIEW_COLUMNS =
  "tournament_id, rank, name, name_sorted, federation, federations, tournament_rating, " +
  "points, performance_rating, match_score, rs_player_id, unique_no, " +
  "fide_id, title, sex, fide_rating, current_rating, birth_year"

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await ratingsServer
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as unknown as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return rows
}

/** Server-only preview of the additive incremental identity projection. */
export async function fetchShadowRankingData(): Promise<{
  appearances: RawViewRow[]
  tournaments: RawTournament[]
}> {
  const [appearances, tournaments] = await Promise.all([
    fetchAll<RawViewRow>("rs_local_active_players_cached_shadow", VIEW_COLUMNS),
    fetchAll<RawTournament>("sd_tournaments", "id, tournament_name, date"),
  ])
  return { appearances, tournaments }
}
