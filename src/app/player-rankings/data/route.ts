import { NextResponse, type NextRequest } from "next/server"
import { getPlayerAppearances, getSummaries } from "@/lib/rankingsServer"

// Mirrors the page's cache window; the underlying aggregation is cached per-period.
export const revalidate = 3600

function parsePeriod(v: string | null): number | undefined {
  if (!v || v === "all") return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Rankings data endpoint.
 *   GET ?period=all|2024|2025         → { players: RankedSummary[] }
 *   GET ?period=...&key=<playerKey>   → { appearances: Appearance[] }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = parsePeriod(searchParams.get("period"))
  const key = searchParams.get("key")

  if (key) {
    const appearances = await getPlayerAppearances(key, period)
    return NextResponse.json({ appearances })
  }
  const players = await getSummaries(period)
  return NextResponse.json({ players })
}
