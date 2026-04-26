import { NextResponse } from 'next/server'
import { Chess } from 'chess.js'

const VALID_DIFFICULTIES = ['easiest', 'easier', 'normal', 'harder', 'hardest'] as const
type Difficulty = typeof VALID_DIFFICULTIES[number]

// Full list of valid Lichess puzzle angles — used for random selection when themes=mixed
const ALL_THEMES = [
  // Openings
  'caroKann', 'slavDefense', 'frenchDefense', 'sicilianDefense', 'italianGame',
  'spanishGame', 'kingsGambit', 'queensGambit', 'englishOpening', 'scotchGame',
  'viennaGame', 'kingIndianDefense', 'nimzoIndianDefense', 'dutchDefense',
  // Tactics
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'deflection',
  'hangingPiece', 'trappedPiece', 'attraction', 'interference', 'clearance',
  'overloading', 'sacrifice', 'quietMove',
  // Mates
  'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
  'backRankMate', 'smotheredMate', 'arabianMate', 'hookMate', 'anastasiasMate', 'epauletteMate',
  // Endgame
  'endgame', 'pawnEndgame', 'rookEndgame', 'queenEndgame',
  'bishopEndgame', 'knightEndgame',
  // Strategy
  'advancedPawn', 'attackingF2F7', 'capturingDefender', 'exposedKing',
  'kingsideAttack', 'queensideAttack', 'crushing', 'defensiveMove',
  // Special
  'enPassant', 'promotion', 'zugzwang', 'xRayAttack', 'coercion',
]

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

function shuffle<T>(arr: T[]): T[] {
  return pickRandom(arr, arr.length)
}

function fenAtPly(pgn: string, initialPly: number): string {
  const game = new Chess()
  const moves = pgn
    .trim()
    .split(/\s+/)
    .filter(t =>
      !/^\d+\.+$/.test(t) &&
      !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t) &&
      !/^[!?]+$/.test(t)
    )
  for (let i = 0; i <= Math.min(initialPly, moves.length - 1); i++) {
    try {
      const result = game.move(moves[i])
      if (!result) break
    } catch {
      break
    }
  }
  return game.fen()
}

function uciSolutionToSan(fen: string, uciMoves: string[]): string[] {
  const game = new Chess(fen)
  return uciMoves.map(uci => {
    const from  = uci.slice(0, 2)
    const to    = uci.slice(2, 4)
    const promo = uci[4] ?? null
    try {
      const legal = game.moves({ verbose: true }) as any[]
      const match = legal.find(m => m.from === from && m.to === to && (!promo || m.promotion === promo))
      if (!match) return uci
      game.move(match.san)
      return match.san as string
    } catch {
      return uci
    }
  })
}

async function fetchSingleBatch(
  theme: string,
  difficulty: Difficulty,
  nb: number,
  token: string
): Promise<any[]> {
  const url = `https://lichess.org/api/puzzle/batch/${theme}?nb=${nb}&difficulty=${difficulty}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    console.error(`Lichess batch fetch failed for theme=${theme} difficulty=${difficulty}: ${res.status}`)
    return []
  }
  const data = await res.json()
  return data.puzzles ?? []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Accept both `themes` (new) and `theme` (legacy single-value)
  const themesRaw   = searchParams.get('themes') ?? searchParams.get('theme')
  const difficultyRaw = searchParams.get('difficulty') || 'normal'
  const nb = Math.min(50, Math.max(1, parseInt(searchParams.get('nb') || '10', 10)))

  if (!themesRaw) {
    return NextResponse.json({ error: 'themes is required' }, { status: 400 })
  }

  const token = process.env.LICHESS_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'LICHESS_API_TOKEN not configured' }, { status: 500 })
  }

  // Resolve themes list
  const themes: string[] =
    themesRaw === 'mixed'
      ? pickRandom(ALL_THEMES, 4)
      : themesRaw.split(',').map(t => t.trim()).filter(Boolean)

  if (themes.length === 0) {
    return NextResponse.json({ error: 'At least one theme is required' }, { status: 400 })
  }

  // Resolve difficulty list
  const difficulties: Difficulty[] =
    difficultyRaw === 'mixed'
      ? ['easier', 'normal', 'harder']
      : VALID_DIFFICULTIES.includes(difficultyRaw as Difficulty)
        ? [difficultyRaw as Difficulty]
        : ['normal']

  // Per-call count — distribute evenly across (theme × difficulty) pairs
  const pairCount    = themes.length * difficulties.length
  const nbPerCall    = Math.ceil(nb / pairCount)

  // Build all (theme, difficulty) pairs and fetch in parallel
  const pairs: Array<{ theme: string; difficulty: Difficulty }> = []
  for (const theme of themes) {
    for (const diff of difficulties) {
      pairs.push({ theme, difficulty: diff })
    }
  }

  try {
    const results = await Promise.all(
      pairs.map(({ theme, difficulty }) => fetchSingleBatch(theme, difficulty, nbPerCall, token))
    )

    // Flatten, deduplicate by puzzle id, map to output shape, shuffle, take first nb
    const seen = new Set<string>()
    const allPuzzles: any[] = []

    for (const batch of results) {
      for (const item of batch) {
        const id: string = item.puzzle?.id
        if (!id || seen.has(id)) continue
        seen.add(id)

        const pgn: string      = item.game?.pgn ?? ''
        const initialPly: number = item.puzzle?.initialPly ?? 0
        const fen              = fenAtPly(pgn, initialPly)
        const turn             = fen.split(' ')[1]
        const uciMoves: string[] = item.puzzle?.solution ?? []
        const sanMoves         = uciSolutionToSan(fen, uciMoves)

        allPuzzles.push({
          lichessId: id,
          fen,
          pgn,
          solution:    sanMoves,
          themes:      item.puzzle.themes as string[],
          rating:      item.puzzle.rating ?? null,
          orientation: turn === 'b' ? 'black' : 'white',
        })
      }
    }

    const puzzles = shuffle(allPuzzles).slice(0, nb)
    return NextResponse.json({ puzzles })
  } catch (error) {
    console.error('Lichess batch fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch batch puzzles' }, { status: 500 })
  }
}
