import { Chess } from 'chess.js'

export interface ParsedPgnMove {
  moveNumber: number
  san: string
  nag?: string
  fen: string
  comment?: string
  clock?: string
  eval?: string | number
  arrows?: Array<{ from: string; to: string; color: string }>
  highlights?: string[]
  variations?: ParsedPgnMove[][]
}

export interface ParsedPgnChapter {
  headers: Record<string, string>
  moves: ParsedPgnMove[]
  fullPgn: string
}

export interface ParsedPgnStudy {
  chapters: ParsedPgnChapter[]
  studyName?: string
}

export interface PgnAnnotations {
  clock?: string
  eval?: string | number | undefined
  arrows?: Array<{ from: string; to: string; color: string }>
  highlights?: string[]
}

const FEN_INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const FILE_TO_COL = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }
const COL_TO_FILE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// Castling variants include optional check/mate suffix; pawn-to-rank handles e.g. a1 (rare promotions)
const SAN_REGEX = /^[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?$|^O-O(?:-O)?[+#]?$|^0-0(?:-0)?[+#]?$|^[a-h][1-8]$/

const NAG_REGEX = /^(.+?)(!{1,2}|\?{1,2}|\?!\?!|!\?|\?\?=|\?!|=\+|=|\+-|~|\+|-\+|-\-|□|△|▽|⊗|⊙|→|⇢|∇|◊|®|©|™|±|∓|⩱|⩲|∞|↻|↺|⊕|⊖)$/

const isValidChessMove = (token: string): { valid: boolean; san: string; nag?: string } => {
  if (!token) return { valid: false, san: '' }
  if (token === '*' || token === '1-0' || token === '0-1' || token === '1/2-1/2') return { valid: false, san: '' }
  if (/^\d+\.$/.test(token)) return { valid: false, san: '' }
  if (/^\d+\)\s*/.test(token)) return { valid: false, san: '' }
  if (/^\d+\.\.\.$/.test(token)) return { valid: false, san: '' }
  
  const nagMatch = token.match(NAG_REGEX)
  if (nagMatch) {
    const san = nagMatch[1]
    if (SAN_REGEX.test(san)) {
      return { valid: true, san, nag: nagMatch[2] }
    }
  }
  
  if (SAN_REGEX.test(token)) {
    return { valid: true, san: token }
  }
  
  return { valid: false, san: '' }
}

export function parseAlgebraicSquare(square: string): { file: number; rank: number } | null {
  if (square.length !== 2) return null
  const file = FILE_TO_COL[square[0] as keyof typeof FILE_TO_COL]
  const rank = parseInt(square[1], 10)
  if (file === undefined || isNaN(rank) || rank < 1 || rank > 8) return null
  return { file, rank: rank - 1 }
}

export function squareToFen(file: number, rank: number): string {
  return `${COL_TO_FILE[file]}${rank + 1}`
}

export function isValidFen(fen: string): boolean {
  if (!fen) return false
  
  const parts = fen.trim().split(/\s+/)
  if (parts.length < 2) return false

  const position = parts[0]
  const ranks = position.split('/')
  if (ranks.length !== 8) return false

  for (const rank of ranks) {
    let count = 0
    for (const char of rank) {
      if (/\d/.test(char)) {
        count += parseInt(char, 10)
      } else if (/[prnbqkPRNBQK]/.test(char)) {
        count += 1
      } else {
        return false
      }
    }
    if (count !== 8) return false
  }

  const validColors = ['w', 'b']
  if (!validColors.includes(parts[1])) return false

  return true
}

export function parsePgnAnnotations(comment: string): PgnAnnotations {
  const annotations: PgnAnnotations = {}

  const clockMatch = comment.match(/\[%clk (\d+:\d+:\d+)\]/)
  if (clockMatch) {
    annotations.clock = clockMatch[1]
  }

  const evalMatch = comment.match(/\[%eval ([#+-]?\d+(?:\.\d+)?)\]/)
  if (evalMatch) {
    const evalStr = evalMatch[1]
    if (evalStr.startsWith('#')) {
      annotations.eval = parseInt(evalStr.slice(1), 10) > 0 ? evalStr : evalStr
    } else {
      annotations.eval = parseFloat(evalStr)
    }
  }

  const arrowMatch = comment.match(/\[%cal ([GRYBOP])([a-h][1-8][a-h][1-8](?:,[a-h][1-8][a-h][1-8])*)\]/)
  if (arrowMatch && arrowMatch[2]) {
    annotations.arrows = []
    const color = arrowMatch[1]
    const squares = arrowMatch[2].match(/[a-h][1-8]/g) || []
    for (let i = 0; i < squares.length - 1; i++) {
      annotations.arrows.push({
        from: squares[i],
        to: squares[i + 1],
        color: getArrowColor(color),
      })
    }
  }

  const highlightMatch = comment.match(/\[%csl ([GRYBOP])([a-h][1-8](?:,[a-h][1-8])*)\]/)
  if (highlightMatch && highlightMatch[2]) {
    annotations.highlights = highlightMatch[2].split(',')
  }

  return annotations
}

function getArrowColor(code: string): string {
  const colors: Record<string, string> = {
    G: 'green',
    R: 'red',
    Y: 'yellow',
    B: 'blue',
    O: 'orange',
    P: 'purple',
  }
  return colors[code] || 'green'
}

export function parsePgn(pgn: string): ParsedPgnChapter {
  const lines = pgn.split('\n')
  const headers: Record<string, string> = {}
  let movetext = ''
  let inHeaders = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { inHeaders = false; continue }

    if (inHeaders && trimmed.startsWith('[')) {
      const match = trimmed.match(/\[(\w+)\s+"([^"]+)"\]/)
      if (match) headers[match[1]] = match[2]
    } else {
      inHeaders = false
      movetext += ' ' + trimmed
    }
  }

  // Support games that start from a custom FEN (e.g. [SetUp "1"] [FEN "..."])
  const startFen =
    headers['SetUp'] === '1' && headers['FEN'] ? headers['FEN'] : FEN_INITIAL

  return { headers, moves: parseMovetext(movetext, startFen), fullPgn: pgn }
}

export function parsePgnStudy(pgn: string): ParsedPgnStudy {
  const chapters: ParsedPgnChapter[] = []
  let studyName: string | undefined

  // Split on blank line followed by a header tag (handles both \r\n and \n)
  const gameBlocks = pgn
    .split(/\n\n(?=\[)/)
    .map(b => b.trim())
    .filter(b => b.startsWith('['))

  for (const block of gameBlocks) {
    const lines = block.split('\n')
    const headers: Record<string, string> = {}
    let movetext = ''
    let inHeaders = true

    for (const line of lines) {
      const l = line.trim()
      if (!l) { inHeaders = false; continue }

      if (inHeaders && l.startsWith('[')) {
        const match = l.match(/\[(\w+)\s+"([^"]+)"\]/)
        if (match) {
          headers[match[1]] = match[2]
          if (match[1] === 'StudyName') studyName = match[2]
        }
      } else {
        inHeaders = false
        movetext += ' ' + l
      }
    }

    if (movetext.trim()) {
      const startFen =
        headers['SetUp'] === '1' && headers['FEN'] ? headers['FEN'] : FEN_INITIAL
      chapters.push({
        headers,
        moves: parseMovetext(movetext, startFen),
        fullPgn: block,
      })
    }
  }

  return { chapters, studyName }
}

function parseMovetext(movetext: string, startFen: string = FEN_INITIAL): ParsedPgnMove[] {
  return parseMovetextWithComments(movetext, startFen)
}

/**
 * Proper character-by-character PGN movetext parser.
 * Handles: comments {…}, variations (…), NAGs $N, move-embedded annotations ?!/??/!!/!
 * Multiple comment blocks per move are merged: text comments → comment field,
 * machine annotation blocks ([%eval] [%clk] [%cal] [%csl]) → structured fields.
 */
function parseMovetextWithComments(
  movetext: string,
  startFen: string = FEN_INITIAL
): ParsedPgnMove[] {
  const moves: ParsedPgnMove[] = []
  const game = new Chess(startFen)
  let moveNumber = Math.ceil(game.moveNumber())

  const s = movetext
  let i = 0

  while (i < s.length) {
    const ch = s[i]

    // Whitespace
    if (/\s/.test(ch)) { i++; continue }

    // Comment block {…} — attach to the preceding move (or discard if no moves yet)
    if (ch === '{') {
      i++ // skip opening brace
      let comment = ''
      let depth = 0
      while (i < s.length) {
        const c = s[i]
        if (c === '{') { depth++; comment += c; i++ }
        else if (c === '}') {
          if (depth === 0) { i++; break }
          depth--; comment += c; i++
        } else { comment += c; i++ }
      }
      if (moves.length > 0) {
        attachCommentToMove(moves[moves.length - 1], comment.trim())
      }
      continue
    }

    // Variation (…) — skip entirely (main line only)
    if (ch === '(') {
      let depth = 0
      while (i < s.length) {
        if (s[i] === '(') depth++
        else if (s[i] === ')') { depth--; if (depth === 0) { i++; break } }
        i++
      }
      continue
    }

    // NAG numeric annotation $N — skip
    if (ch === '$') {
      while (i < s.length && !/\s/.test(s[i])) i++
      continue
    }

    // Read token (until whitespace or comment/variation delimiter)
    let token = ''
    while (i < s.length && !/[\s{}()]/.test(s[i])) token += s[i++]

    if (!token) continue

    // Result markers — stop
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') break

    // Move number indicators like "1.", "1...", "12.", "1…"
    if (/^\d+\.+$/.test(token) || /^\d+…+$/.test(token)) continue

    // Attempt to interpret as a chess move
    const moveCheck = isValidChessMove(token)
    if (moveCheck.valid) {
      const fenBefore = game.fen()
      try {
        const result = game.move(moveCheck.san)
        if (result) {
          moves.push({
            moveNumber,
            san: moveCheck.san,
            nag: moveCheck.nag,
            fen: fenBefore,
            comment: undefined,
            clock: undefined,
            eval: undefined,
          })
          // Full move number increments after black's move
          if (result.color === 'b') moveNumber++
        }
      } catch { /* illegal in current position — skip */ }
    }
  }

  return moves
}

/**
 * Attaches a single comment block to a move.
 * Annotation blocks ([%clk], [%eval], [%cal], [%csl]) are parsed into
 * structured fields. Plain-text blocks become the human-readable `comment`.
 */
function attachCommentToMove(move: ParsedPgnMove, comment: string): void {
  if (!comment) return
  const isAnnotation =
    comment.includes('%clk') || comment.includes('%eval') ||
    comment.includes('%cal') || comment.includes('%csl')

  if (isAnnotation) {
    const a = parsePgnAnnotations(comment)
    if (a.clock !== undefined)      move.clock      = a.clock
    if (a.eval  !== undefined)      move.eval       = a.eval as number
    if (a.arrows?.length)           move.arrows     = a.arrows
    if (a.highlights?.length)       move.highlights = a.highlights
  } else {
    // Human-readable annotation — append if multiple text blocks exist
    move.comment = move.comment ? `${move.comment} ${comment}` : comment
  }
}

export function extractStudyChapterMetadata(pgn: string): {
  studyName?: string
  chapterName?: string
  chapterUrl?: string
  event?: string
  opening?: string
  eco?: string
  orientation?: 'white' | 'black'
} {
  const parsed = parsePgn(pgn)
  const { headers } = parsed

  return {
    studyName: headers['StudyName'],
    chapterName: headers['ChapterName'],
    chapterUrl: headers['ChapterURL'],
    event: headers['Event'],
    opening: headers['Opening'],
    eco: headers['ECO'],
    orientation: headers['Orientation'] === 'black' ? 'black' : 'white',
  }
}

export function validatePuzzleData(fen: string, solution: string[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!isValidFen(fen)) {
    errors.push('Invalid FEN position')
  }

  if (!solution || solution.length === 0) {
    errors.push('Solution cannot be empty')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function convertUciToSan(uci: string, _fen: string): string {
  if (uci.length !== 4 && uci.length !== 5) return uci
  
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  
  return `${from}-${to}`
}

const COLOR_TO_CODE: Record<string, string> = { green: 'G', red: 'R', yellow: 'Y', blue: 'B', orange: 'O', purple: 'P' }

export function serializeAnnotations(
  arrows: Array<{ from: string; to: string; color: string }>,
  highlights: string[]
): string {
  const parts: string[] = []

  if (arrows.length > 0) {
    const arrowStr = arrows.map(a => `${COLOR_TO_CODE[a.color] || 'G'}${a.from}${a.to}`).join('')
    parts.push(`[%cal ${arrowStr}]`)
  }

  if (highlights.length > 0) {
    const highlightStr = highlights.map(h => `G${h}`).join(',')
    parts.push(`[%csl ${highlightStr}]`)
  }

  return parts.join(' ')
}

export interface MoveAnnotation {
  arrows: Array<{ from: string; to: string; color: string }>
  highlights: string[]
}

export function injectAnnotationsIntoPgn(
  pgn: string,
  annotations: Map<string, MoveAnnotation>
): string {
  if (annotations.size === 0) return pgn

  const lines = pgn.split('\n')
  let headers = ''
  let movetext = ''
  let inHeaders = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inHeaders) headers += '\n'
      continue
    }
    if (inHeaders && trimmed.startsWith('[')) {
      headers += line + '\n'
    } else {
      inHeaders = false
      movetext += ' ' + trimmed
    }
  }

  const sanitized = movetext
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = sanitized.split(/\s+/)
  const result: string[] = []
  let moveIndex = 0

  for (const token of tokens) {
    if (/^\d+\.+$/.test(token) || /^\d+\.\.\.$/.test(token)) {
      result.push(token)
      continue
    }
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
      result.push(token)
      continue
    }

    const nagMatch = token.match(NAG_REGEX)
    const san = nagMatch ? nagMatch[1] : token
    const nag = nagMatch ? nagMatch[2] : ''

    if (SAN_REGEX.test(san)) {
      const key = `${moveIndex}`
      const anno = annotations.get(key)
      if (anno) {
        const comment = serializeAnnotations(anno.arrows, anno.highlights)
        if (comment) {
          result.push(`${san}${nag} {${comment}}`)
        } else {
          result.push(`${san}${nag}`)
        }
      } else {
        result.push(`${san}${nag}`)
      }
      moveIndex++
    } else {
      result.push(token)
    }
  }

  return (headers.trimEnd() + '\n\n' + result.join(' ')).trim()
}