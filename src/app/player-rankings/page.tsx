import { getSummaries } from "@/lib/rankingsServer"
import RankingsView from "./RankingsView"
import { DEFAULT_PERIOD } from "./constants"

// Cache the aggregated pull from the ratings project for an hour. New ratings
// data appears within this window rather than instantly. Aggregation now runs
// server-side (see rankingsServer.ts) so the client never downloads the raw
// ~7k appearance rows nor runs rankPlayers().
export const revalidate = 3600

export default async function PlayerRankingsPage() {
  // Seed the pool for the DEFAULT period (not all-time) so the first paint —
  // including SSR, no-JS and cold private-tab loads — already has data and needs
  // no client round-trip. Other periods + expanded histories load on demand.
  const initialPlayers = await getSummaries(DEFAULT_PERIOD)
  return <RankingsView initialPlayers={initialPlayers} initialPeriod={DEFAULT_PERIOD} />
}
