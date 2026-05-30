import { getSummaries } from "@/lib/rankingsServer"
import RankingsView from "./RankingsView"

// Cache the aggregated pull from the ratings project for an hour. New ratings
// data appears within this window rather than instantly. Aggregation now runs
// server-side (see rankingsServer.ts) so the client never downloads the raw
// ~7k appearance rows nor runs rankPlayers().
export const revalidate = 3600

export default async function PlayerRankingsPage() {
  // All-time pool, summaries only (no appearance history). Period switches and
  // expanded-row histories are fetched on demand from /player-rankings/data.
  const initialPlayers = await getSummaries()
  return <RankingsView initialPlayers={initialPlayers} />
}
