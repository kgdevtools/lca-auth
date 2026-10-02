import { NextRequest, NextResponse } from 'next/server'
import { getPlayer } from '@/lib/rankingsServer'
import { findPlayerGames } from '@/lib/playerGames'

// Games are linked by fuzzy PGN matching (several sequential table reads), so this
// is split out of the profile page render and fetched on demand when the Games tab
// opens — keeping the page's TTFB fast. Player name + tournament names come from the
// cached rankings pool (cheap), not the per-profile roster fetch.
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const key = params.get('key')
    if (!key) return NextResponse.json({ games: [] })

    const player = await getPlayer(key, undefined, params.get('source') === 'shadow' ? 'shadow' : 'current')
    if (!player) return NextResponse.json({ games: [] })

    const tournamentNames = player.appearances.map((a) => a.tournamentName)
    const games = await findPlayerGames(player.name, tournamentNames)
    return NextResponse.json({ games })
  } catch (err) {
    console.error('[api/players/games] error:', err)
    return NextResponse.json({ games: [] })
  }
}
