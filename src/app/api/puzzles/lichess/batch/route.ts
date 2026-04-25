import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'

const VALID_DIFFICULTIES = ['easiest', 'easier', 'normal', 'harder', 'hardest'] as const

function fenAtPly(pgn: string, initialPly: number): string {
  const game = new Chess()
  // Strip move numbers ("1.", "22.", "1..."), result tokens, and annotation glyphs
  const moves = pgn
    .trim()
    .split(/\s+/)
    .filter(t =>
      !/^\d+\.+$/.test(t) &&
      !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) &&
      !/^[!?]+$/.test(t)
    )

  // initialPly is the 0-based index of the last setup move — replay through it (inclusive)
  for (let i = 0; i <= Math.min(initialPly, moves.length - 1); i++) {
    try {
      const result = game.move(moves[i])
      if (!result) {
        console.error(`fenAtPly: move returned null at index ${i}: "${moves[i]}"`)
        break
      }
    } catch (e) {
      console.error(`fenAtPly: move threw at index ${i}: "${moves[i]}"`, e)
      break
    }
  }
  return game.fen()
}

// Convert UCI solution moves to SAN from the puzzle starting FEN.
// Uses verbose move lookup instead of game.move({from,to}) to avoid
// chess.js beta throwing on moves that need disambiguation context.
function uciSolutionToSan(fen: string, uciMoves: string[]): string[] {
  const game = new Chess(fen)
  return uciMoves.map(uci => {
    const from = uci.slice(0, 2)
    const to   = uci.slice(2, 4)
    const promo = uci[4] ?? null
    try {
      const legal = game.moves({ verbose: true }) as any[]
      const match = legal.find(m =>
        m.from === from && m.to === to && (!promo || m.promotion === promo)
      )
      if (!match) return uci
      game.move(match.san)
      return match.san as string
    } catch {
      return uci
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const theme = searchParams.get('theme')
  const difficulty = searchParams.get('difficulty') || 'normal'
  const nb = Math.min(50, Math.max(1, parseInt(searchParams.get('nb') || '10', 10)))

  if (!theme) {
    return NextResponse.json({ error: 'theme is required' }, { status: 400 })
  }

  if (!VALID_DIFFICULTIES.includes(difficulty as any)) {
    return NextResponse.json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` }, { status: 400 })
  }

  const token = process.env.LICHESS_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'LICHESS_API_TOKEN not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://lichess.org/api/puzzle/batch/${theme}?nb=${nb}&difficulty=${difficulty}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch puzzles from Lichess' },
        { status: response.status }
      )
    }

    const data = await response.json()

    const puzzles = (data.puzzles ?? []).map((item: any) => {
      const pgn: string = item.game?.pgn ?? ''
      const initialPly: number = item.puzzle?.initialPly ?? 0

      const fen = fenAtPly(pgn, initialPly)
      const turn = fen.split(' ')[1]
      const uciMoves: string[] = item.puzzle?.solution ?? []
      const sanMoves = uciSolutionToSan(fen, uciMoves)

      console.log(`[puzzle ${item.puzzle?.id}] initialPly=${initialPly} turn=${turn} uci=${uciMoves.join(' ')} → san=${sanMoves.join(' ')}`)

      return {
        lichessId: item.puzzle.id,
        fen,
        pgn: pgn,
        solution: sanMoves,
        themes: item.puzzle.themes as string[],
        rating: item.puzzle.rating ?? null,
        orientation: turn === 'b' ? 'black' : 'white',
      }
    })

    return NextResponse.json({ puzzles })
  } catch (error) {
    console.error('Lichess batch fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch puzzles' }, { status: 500 })
  }
}
