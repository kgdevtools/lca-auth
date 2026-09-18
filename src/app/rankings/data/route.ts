import { NextResponse, type NextRequest } from "next/server"
import {
  getShadowPlayerAppearances,
  getShadowSummaries,
} from "@/lib/rankingsServer"

export const revalidate = 3600

function parsePeriod(value: string | null): number | undefined {
  if (!value || value === "all") return undefined
  const period = Number(value)
  return Number.isFinite(period) ? period : undefined
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = parsePeriod(searchParams.get("period"))
  const key = searchParams.get("key")

  if (key) {
    return NextResponse.json({
      appearances: await getShadowPlayerAppearances(key, period),
    })
  }

  return NextResponse.json({ players: await getShadowSummaries(period) })
}
