import { Chess } from 'chess.js'

export interface ParsedStudyMove {
  san: string
  uci: string
  fen: string
  comments: string[]
  annotations: MoveAnnotation[]
}

export interface MoveAnnotation {
  type: 'eval' | 'clock' | 'arrow' | 'highlight'
  value: string
}

export interface ParsedChapter {
  name: string
  pgn: string
  moves: ParsedStudyMove[]
  initialFen: string
}

const ANNOTATION_PATTERNS = {
  eval: /\[%eval ([#+-]?\d+(?:\.\d+)?)\]/g,
  clock: /\[%clk (\d+:\d+:\d+)\]/g,
  arrows: /\[%cal ([GRYBOP])([a-h][1-8])([a-h][1-8](?:,[a-h][1-8])*)\]/g,
  highlights: /\[%csl ([GRYBOP])([a-h][1-8](?:,[a-h][1-8])*)\]/g,
}

export function parseStudyPgn(pgn: string): ParsedChapter {
  const game = new Chess()
  
  try {
    game.loadPgn(pgn)
  } catch (error) {
    console.error('Failed to parse PGN:', error)
  }

  const initialFen = game.fen()
  const history = game.history({ verbose: true })

  const moves: ParsedStudyMove[] = []
  const tempGame = new Chess()

  history.forEach((move, index) => {
    tempGame.move(move)
    
    const moveText = pgn.split('\n').find(line => line.includes(move.san)) || ''
    
    const annotations: MoveAnnotation[] = []
    
    let evalMatch
    const evalRegex = new RegExp(ANNOTATION_PATTERNS.eval)
    while ((evalMatch = evalRegex.exec(moveText)) !== null) {
      annotations.push({ type: 'eval', value: evalMatch[1] })
    }
    
    let clockMatch
    const clockRegex = new RegExp(ANNOTATION_PATTERNS.clock)
    while ((clockMatch = clockRegex.exec(moveText)) !== null) {
      annotations.push({ type: 'clock', value: clockMatch[1] })
    }

    const comments: string[] = []

    moves.push({
      san: move.san,
      uci: move.from + move.to + (move.promotion || ''),
      fen: tempGame.fen(),
      comments,
      annotations,
    })
  })

  const chapterNameMatch = pgn.match(/\[Chapter "\s*([^"]+)\s*"\]/)
  const name = chapterNameMatch ? chapterNameMatch[1] : 'Untitled Chapter'

  return {
    name,
    pgn,
    moves,
    initialFen,
  }
}

export function extractAnnotationsFromPgn(pgn: string): {
  evals: Map<number, string>
  clocks: Map<number, string>
  arrows: Map<number, string[]>
  highlights: Map<number, string[]>
} {
  const evals = new Map<number, string>()
  const clocks = new Map<number, string>()
  const arrows = new Map<number, string[]>()
  const highlights = new Map<number, string[]>()

  const lines = pgn.split('\n')
  let moveNumber = 0

  lines.forEach(line => {
    const evalMatch = line.match(ANNOTATION_PATTERNS.eval)
    if (evalMatch) {
      evals.set(moveNumber, evalMatch[1])
    }

    const clockMatch = line.match(ANNOTATION_PATTERNS.clock)
    if (clockMatch) {
      clocks.set(moveNumber, clockMatch[1])
    }

    const arrowMatch = line.match(ANNOTATION_PATTERNS.arrows)
    if (arrowMatch) {
      arrows.set(moveNumber, [arrowMatch[1], arrowMatch[2], arrowMatch[3]])
    }

    const highlightMatch = line.match(ANNOTATION_PATTERNS.highlights)
    if (highlightMatch) {
      highlights.set(moveNumber, [highlightMatch[1], highlightMatch[2]])
    }

    if (line.match(/\d+\.\s*\S+/)) {
      moveNumber++
    }
  })

  return { evals, clocks, arrows, highlights }
}

export function validateStudyId(studyId: string): boolean {
  return /^[a-zA-Z0-9]{8,}$/.test(studyId)
}