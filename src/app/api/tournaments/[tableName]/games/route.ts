import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  props: { params: Promise<{ tableName: string }> }
) {
  const params = await props.params

  // Validate table name (only alphanumeric and underscores)
  const tableNameRegex = /^[a-z0-9_]+$/
  if (!params.tableName || !tableNameRegex.test(params.tableName)) {
    return NextResponse.json(
      { error: 'Invalid tournament table name' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()

    // Only select columns that actually exist in the table
    const { data, error } = await supabase
      .from(params.tableName)
      .select('id, created_at, title, pgn')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching games:', error)
      return NextResponse.json(
        { error: 'Failed to fetch games' },
        { status: 500 }
      )
    }

    // Process games: handle JSONB pgn column and extract metadata from PGN
    const processedGames = (data || []).map((game: any) => {
      // Handle JSONB pgn column - convert to string if needed
      let pgnString = ''
      if (game.pgn) {
        pgnString = typeof game.pgn === 'string' ? game.pgn : JSON.stringify(game.pgn)
      }

      // Parse PGN headers to extract white, black, event, result
      const headers = parsePgnHeaders(pgnString)

      return {
        id: game.id,
        title: game.title,
        pgn: pgnString,
        white: headers.White || 'Unknown',
        black: headers.Black || 'Unknown',
        event: headers.Event || '',
        result: headers.Result || '*',
      }
    })

    return NextResponse.json(processedGames)
  } catch (error) {
    console.error('Error in GET /api/tournaments/[tableName]/games:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to parse PGN headers
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerRegex = /^\s*\[([^\s\]]+)\s+"([^"]*)"\]/gm
  let match
  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2]
  }
  return headers
}
