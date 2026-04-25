import { PGN_ANNOTATION_REGEX } from './constants/lessonBlocks'
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

const SAN_REGEX = /^[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBNP])?[+#]?$|^O-O(?:-O)?$|^0-0(?:-0)?$|^[a-h][1-8]$/

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
    if (!trimmed) continue

    if (inHeaders && trimmed.startsWith('[')) {
      const match = trimmed.match(/\[(\w+)\s+"([^"]+)"\]/)
      if (match) {
        headers[match[1]] = match[2]
      }
    } else {
      inHeaders = false
      movetext += ' ' + trimmed
    }
  }

  const moves = parseMovetext(movetext)

  return {
    headers,
    moves,
    fullPgn: pgn,
  }
}

export function parsePgnStudy(pgn: string): ParsedPgnStudy {
  const chapters: ParsedPgnChapter[] = []
  let studyName: string | undefined

  const gameBlocks = pgn.split(/\n(?=\[Event\b)/g).filter(b => b.trim())

  for (const block of gameBlocks) {
    const trimmed = block.trim()
    if (!trimmed || !trimmed.startsWith('[')) continue

    const lines = trimmed.split('\n')
    const headers: Record<string, string> = {}
    let movetext = ''
    let inHeaders = true

    for (const line of lines) {
      const l = line.trim()
      if (!l) continue

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
      chapters.push({
        headers,
        moves: parseMovetextWithComments(movetext),
        fullPgn: trimmed,
      })
    }
  }

  return { chapters, studyName }
}

function parseMovetext(movetext: string): ParsedPgnMove[] {
  return parseMovetextWithComments(movetext)
}

function parseMovetextWithComments(movetext: string): ParsedPgnMove[] {
  const moves: ParsedPgnMove[] = []
  
  const cleanText = movetext
    .replace(/\d+\.\.\./g, '')
    .replace(/\d+\./g, ' ')
    .replace(/\d+\)\s*/g, ' ')
    .trim()

  const tokens = cleanText.split(/\s+/)
  let currentFen = FEN_INITIAL
  let moveNumber = 1
  let lastTokenWasMoveNumber = false

  const game = new Chess()
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    
    if (!token) continue
    
    if (/^\d+\.\.\.$/.test(token) || /^\d+\)\s*$/.test(token)) {
      lastTokenWasMoveNumber = true
      continue
    }
    
    if (/^\d+\.$/.test(token)) {
      lastTokenWasMoveNumber = true
      continue
    }
    
    const isBlack = lastTokenWasMoveNumber
    
    const moveCheck = isValidChessMove(token)
    if (moveCheck.valid) {
      const escapedSan = moveCheck.san.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const commentRegex = new RegExp(`${escapedSan}\\s*(\\{[^}]*\\})`)
      const commentMatch = movetext.match(commentRegex)
      
      let commentText: string | undefined
      if (commentMatch && commentMatch[1]) {
        const commentContent = commentMatch[1].slice(1, -1)
        const annotations = parsePgnAnnotations(commentContent)
        
        const parts: string[] = []
        if (commentContent.includes('%clk') || commentContent.includes('%eval') || 
            commentContent.includes('%cal') || commentContent.includes('%csl')) {
          if (annotations.clock) parts.push(`[%clk ${annotations.clock}]`)
          if (annotations.eval) parts.push(`[%eval ${annotations.eval}]`)
          if (annotations.arrows?.length) {
            const arrowStr = annotations.arrows.map(a => `${a.color === 'green' ? 'G' : a.color === 'red' ? 'R' : a.color === 'blue' ? 'B' : a.color === 'yellow' ? 'Y' : 'O'}${a.from}${a.to}`).join('')
            parts.push(`[%cal ${arrowStr}]`)
          }
          if (annotations.highlights?.length) {
            parts.push(`[%csl ${annotations.highlights.map(h => h[0].toUpperCase() + h).join('')}]`)
          }
          commentText = parts.length > 0 ? parts.join(' ') : undefined
        } else {
          commentText = commentContent
        }
      }

      try {
        game.move(moveCheck.san)
        
        moves.push({
          moveNumber,
          san: moveCheck.san,
          nag: moveCheck.nag,
          fen: currentFen,
          comment: commentText,
          clock: commentText?.match(PGN_ANNOTATION_REGEX.CLOCK)?.[1],
          eval: commentText?.match(PGN_ANNOTATION_REGEX.EVAL)?.[1] ? parseFloat(commentText.match(PGN_ANNOTATION_REGEX.EVAL)?.[1] || '0') : undefined,
          arrows: commentText?.match(PGN_ANNOTATION_REGEX.ARROWS) ? (() => {
            const match = commentText.match(PGN_ANNOTATION_REGEX.ARROWS)
            if (!match) return undefined
            const color = match[1]
            const squares = match[2].split(',')
            const arrows: Array<{ from: string; to: string; color: string }> = []
            for (let j = 0; j < squares.length - 1; j++) {
              arrows.push({ from: squares[j], to: squares[j + 1], color: getArrowColor(color) })
            }
            return arrows
          })() : undefined,
          highlights: commentText?.match(PGN_ANNOTATION_REGEX.HIGHLIGHTS)?.[2]?.split(','),
        })
        
        currentFen = game.fen()
        
        if (isBlack) moveNumber++
      } catch {
      }
    }
    
    lastTokenWasMoveNumber = false
  }

  return moves
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