/**
 * Server-only rankings aggregation. Keeps `rankPlayers()` (a ~7k-row loop) and
 * the raw 3.5 MB pull OFF the client: the browser never downloads appearance
 * rows nor runs the aggregation. Instead the server computes the ranked pool
 * once per period (cached for an hour) and hands out:
 *   - getSummaries(period)        → ranked players WITHOUT appearances (the table)
 *   - getPlayerAppearances(k, p)  → one player's appearances (an expanded row)
 *
 * Importing `next/cache` keeps this module server-side; it will not bundle into
 * a client component.
 */
import { fetchRankingData } from "./ratingsClient";
import {
  rankPlayers,
  type Appearance,
  type RankedPlayer,
  type RankedSummary,
  type RegionMap,
} from "./rankings";
import regionsData from "./tournament-regions.json";

const regions = regionsData as unknown as RegionMap;

const TTL_MS = 3600_000; // 1 hour — mirrors the page's `revalidate`.

// Module-level in-memory cache, keyed by period. The full ranked pool (~3.4 MB
// with appearances) exceeds Next's 2 MB `unstable_cache` entry limit, so we hold
// it in process memory instead. Survives across requests on a warm server;
// recomputes per period at most once an hour. Pages are also ISR-cached, so this
// only does work for route-handler calls (period switches + expanded histories).
const cache = new Map<string, { at: number; pool: Promise<RankedPlayer[]> }>();

/**
 * Full ranked pool for a period. We always aggregate the widest pool
 * (minTournaments=1, no category, no limit) so every cheap UI filter — region,
 * category, min-events, search, sort, limit — can run client-side over the
 * result without ever re-aggregating.
 */
function getRanked(period?: number): Promise<RankedPlayer[]> {
  const key = String(period ?? "all");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.pool;

  // Store the promise (not the resolved value) so concurrent requests share one
  // in-flight aggregation rather than each kicking off their own.
  const pool = (async () => {
    const { appearances, tournaments } = await fetchRankingData();
    return rankPlayers(appearances, tournaments, regions, {
      minTournaments: 1,
      limit: Number.MAX_SAFE_INTEGER,
      ...(period != null ? { period } : {}),
    });
  })();
  // On failure, evict so the next request retries instead of caching a rejection.
  pool.catch(() => {
    if (cache.get(key)?.pool === pool) cache.delete(key);
  });
  cache.set(key, { at: Date.now(), pool });
  return pool;
}

/** Ranked players for the period, stripped of their appearance history. */
export async function getSummaries(period?: number): Promise<RankedSummary[]> {
  const ranked = await getRanked(period);
  return ranked.map(({ appearances: _drop, ...rest }) => rest);
}

/** One player's appearance history for the period (empty if not found). */
export async function getPlayerAppearances(
  key: string,
  period?: number,
): Promise<Appearance[]> {
  const ranked = await getRanked(period);
  return ranked.find((p) => p.key === key)?.appearances ?? [];
}
