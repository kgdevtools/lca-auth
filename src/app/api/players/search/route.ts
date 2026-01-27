
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return NextResponse.json({ players: [] })
    }

    const supabase = await createClient()
    
    // Search for players in the active_players_august_2025_profiles table
    // Use distinct to get only unique names
    const { data: players, error } = await supabase
      .from('active_players_august_2025_profiles')
      .select('UNIQUE_NO, name, FED, SEX, RATING')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(50) // Get more results to filter distinct names

    if (error) {
      console.error('[api/players/search] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to get only distinct names (first occurrence of each name)
    const distinctPlayers = new Map()
    if (players) {
      for (const player of players) {
        if (player.name && !distinctPlayers.has(player.name)) {
          distinctPlayers.set(player.name, player)
        }
      }
    }

    // Convert back to array and limit to 10 results
    const uniquePlayers = Array.from(distinctPlayers.values()).slice(0, 10)

    return NextResponse.json({ players: uniquePlayers })
  } catch (error) {
    console.error('[api/players/search] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
