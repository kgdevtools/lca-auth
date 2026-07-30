'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Badge } from '@/components/ui/badge'
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Target,
  Sparkles,
  Star,
  Menu,
  ArrowLeft,
  MessageSquare,
  AlignLeft,
  List as ListIcon,
  Check,
} from 'lucide-react'
import { parsePgn, type ParsedPgnMove } from '@/lib/pgnParser'
import { ARROW_RENDER_COLOR, HIGHLIGHT_RENDER_COLOR, type DecorationColor } from '@/lib/decorations'
import { cn } from '@/lib/utils'
import { trackInteractiveSolvePoint } from '@/services/progressService'
import { blockStorageKey, readWithTtl } from '../lessonProgressStorage'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SolvePoint {
  moveIndex: number
  description?: string
  alternatives?: string[]
}

interface InteractiveStudyChapter {
  id: string
  name: string
  orientation: 'white' | 'black'
  pgn: string
  solveMoves?: SolvePoint[]
  headers?: Record<string, string>
  moves?: ParsedPgnMove[]
  fullPgn?: string
}

interface InteractiveStudyViewerBlockProps {
  data: {
    chapters?: InteractiveStudyChapter[]
    displaySettings?: {
      showEval?: boolean
      showClocks?: boolean
      showArrows?: boolean
      showHighlights?: boolean
    }
  }
  onSolved: () => void
  lessonId?: string
  /** Stable block id — enables intra-block progress persistence across refreshes. */
  blockKey?: string
  onBlockComplete?: (pts: number, label: string) => void
}

interface SavedBlockProgress {
  savedAt: number
  chapterIndex: number
  moveIndex: number
  solved: Array<[string, 'main' | 'alternative']>
  points: number
}

interface ParsedMove extends Move {
  moveNumber: number
  comment?: string
  clock?: string
  eval?: string | number
  arrows?: Array<{ from: string; to: string; color?: DecorationColor }>
  highlights?: Array<{ square: string; color?: DecorationColor; squares?: string[] }>
  nag?: string
}

type SolveResult = 'correct' | 'alternative' | 'incorrect' | null

// ── Helpers ───────────────────────────────────────────────────────────────────

const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const POINTS_CORRECT     = 10
const POINTS_ALTERNATIVE = 5

function buildFenHistory(moves: ParsedMove[]): string[] {
  const game = new Chess()
  const hist = [game.fen()]
  for (const m of moves) {
    try {
      game.move({ from: m.from, to: m.to, promotion: m.promotion })
      hist.push(game.fen())
    } catch {
      break
    }
  }
  return hist
}

function isAlternativeMatch(altSan: string, from: string, to: string, fen: string): boolean {
  try {
    const g = new Chess(fen)
    const m = g.move(altSan)
    return m?.from === from && m?.to === to
  } catch {
    return false
  }
}

// ── Score display ─────────────────────────────────────────────────────────────

function ScoreDisplay({ points, delta }: { points: number; delta: number | null }) {
  const [display, setDisplay] = useState(points)

  useEffect(() => {
    if (points === display) return
    const diff = points - display
    const step = diff > 0 ? Math.max(1, Math.ceil(Math.abs(diff) / 8)) : -Math.max(1, Math.ceil(Math.abs(diff) / 8))
    const t = setTimeout(() => {
      setDisplay(prev => {
        const next = prev + step
        if (diff > 0) return Math.min(next, points)
        return Math.max(next, points)
      })
    }, 28)
    return () => clearTimeout(t)
  }, [points, display])

  return (
    <div className="relative flex items-center gap-3 px-3 py-2 bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-sm shadow-lg select-none">
      <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-black tabular-nums leading-none"
          style={{ fontSize: '1.6rem', letterSpacing: '-0.04em', color: '#f8fafc' }}
        >
          {display.toLocaleString()}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">pts</span>
      </div>

      {/* Floating delta */}
      {delta !== null && (
        <span
          key={Date.now()}
          className="absolute right-3 top-0 font-black text-sm pointer-events-none"
          style={{
            color: delta >= POINTS_CORRECT ? '#4ade80' : '#fbbf24',
            animation: 'deltaFloat 1.4s ease-out forwards',
          }}
        >
          +{delta}
        </span>
      )}
    </div>
  )
}

// ── Feedback box ──────────────────────────────────────────────────────────────

function FeedbackBox({ result, reason }: { result: SolveResult; reason: string | null }) {
  if (!result) return null

  const config = {
    correct: {
      wrapper: 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 shadow-[0_4px_16px_rgba(34,197,94,0.18)]',
      animation: 'animate-bounce',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />,
      title: 'Correct!',
      titleColor: 'text-green-800 dark:text-green-300',
      body: `Excellent move! +${POINTS_CORRECT} points`,
      bodyColor: 'text-green-700 dark:text-green-400',
    },
    alternative: {
      wrapper: 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 shadow-[0_4px_16px_rgba(245,158,11,0.18)]',
      animation: 'animate-pulse',
      icon: <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
      title: 'Good Alternative!',
      titleColor: 'text-amber-800 dark:text-amber-300',
      body: `Accepted alternative move. +${POINTS_ALTERNATIVE} points`,
      bodyColor: 'text-amber-700 dark:text-amber-400',
    },
    incorrect: {
      wrapper: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
      animation: 'buzz',
      icon: <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />,
      title: 'Not Quite',
      titleColor: 'text-slate-700 dark:text-slate-300',
      body: reason || 'Incorrect move. Try again.',
      bodyColor: 'text-slate-500 dark:text-slate-400',
    },
  }

  const c = config[result]

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-sm border',
        c.wrapper,
        result !== 'incorrect' && c.animation,
      )}
      style={result === 'incorrect' ? { animation: 'buzz 0.5s ease-in-out' } : undefined}
    >
      {c.icon}
      <div className="min-w-0">
        <p className={cn('text-sm font-black uppercase tracking-wide leading-tight', c.titleColor)}>
          {c.title}
        </p>
        <p className={cn('text-xs mt-0.5 leading-snug', c.bodyColor)}>
          {c.body}
        </p>
      </div>
    </div>
  )
}

// ── Board Controls (blunderbored BoardTransport styling: flex-1, gap-0.5 from
// the parent, no per-button borders/dividers — separation is purely the gap +
// each button's own background) ────────────────────────────────────────────

function TransportBtn({ onClick, disabled, active, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 py-1.5 rounded-sm text-sm transition-colors grid place-items-center disabled:opacity-30 disabled:cursor-not-allowed',
        active ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent text-foreground'
      )}
    >
      {children}
    </button>
  )
}

// A comment string that's purely a machine annotation ([%clk]/[%eval]/[%cal]/[%csl])
// isn't something to show as prose in a "rich text" overlay.
function isDisplayableComment(c?: string): c is string {
  return !!c && !c.includes('%clk') && !c.includes('%eval') && !c.includes('%cal') && !c.includes('%csl')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveStudyViewerBlock({
  data,
  onSolved,
  lessonId,
  blockKey,
  onBlockComplete,
}: InteractiveStudyViewerBlockProps) {
  const chapters = data.chapters || []
  const displaySettings = data.displaySettings || {}
  const showClocks    = displaySettings.showClocks    ?? true
  const showHighlights = displaySettings.showHighlights ?? true
  const showArrows    = displaySettings.showArrows    ?? true

  // ── Core navigation state ─────────────────────────────────────────────────
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentMoveIndex, setCurrentMoveIndex]       = useState(-1)
  const [parsedMoves, setParsedMoves]                 = useState<ParsedMove[]>([])
  const [fenHistory, setFenHistory]                   = useState<string[]>([FEN_START])
  const [headers, setHeaders]                         = useState<Record<string, string>>({})
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false)

  // ── Mobile-only layout state ───────────────────────────────────────────────
  // The moves "stage" on mobile shows exactly one of: the move list itself
  // (inline or list mode), a chapter picker, or a move's comment — as an
  // overlay that covers the moves area rather than opening a separate modal.
  const [mobileOverlay, setMobileOverlay]   = useState<'none' | 'chapters' | 'comment'>('none')
  const [movesViewMode, setMovesViewMode]   = useState<'inline' | 'list'>('inline')
  const [commentOverlayIdx, setCommentOverlayIdx] = useState<number | null>(null)

  // ── Solve state ────────────────────────────────────────────────────────────
  const [solvedMap, setSolvedMap]     = useState<Map<string, 'main' | 'alternative'>>(new Map())
  const [solveResult, setSolveResult] = useState<SolveResult>(null)
  const [illegalReason, setIllegalReason] = useState<string | null>(null)
  const [lastMove, setLastMove]       = useState<{ from: string; to: string } | null>(null)
  const [wrongMoveMade, setWrongMoveMade] = useState(false)

  // ── Points state ──────────────────────────────────────────────────────────
  const [points, setPoints]         = useState(0)
  const [pointsDelta, setPointsDelta] = useState<number | null>(null)

  // ── Board interaction state ───────────────────────────────────────────────
  const [selectedSquare, setSelectedSquare]     = useState<string | null>(null)
  const [customHighlights, setCustomHighlights] = useState<Record<string, string>>({})

  const movesListRef  = useRef<HTMLDivElement>(null)
  const activeMoveRef = useRef<HTMLButtonElement>(null)

  const currentChapter = chapters[currentChapterIndex]

  // ── Intra-block progress persistence (survives refresh, 1-hour TTL) ──────
  const storageKey = lessonId && blockKey ? blockStorageKey(lessonId, blockKey) : null
  const restoredRef = useRef(false)
  // Move index to re-apply once the target chapter's PGN has been parsed.
  const pendingRestoreRef = useRef<{ chapter: number; move: number } | null>(null)

  // Runs before the parse effect below (declaration order) so the pending
  // restore target is visible on the very first parse.
  useEffect(() => {
    if (!storageKey || restoredRef.current) return
    restoredRef.current = true
    const saved = readWithTtl<SavedBlockProgress>(storageKey)
    if (!saved) return
    if (Array.isArray(saved.solved)) setSolvedMap(new Map(saved.solved))
    if (typeof saved.points === 'number' && saved.points > 0) setPoints(saved.points)
    if (
      typeof saved.chapterIndex === 'number' &&
      saved.chapterIndex >= 0 &&
      saved.chapterIndex < chapters.length
    ) {
      pendingRestoreRef.current = {
        chapter: saved.chapterIndex,
        move: typeof saved.moveIndex === 'number' ? saved.moveIndex : -1,
      }
      setCurrentChapterIndex(saved.chapterIndex)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || !restoredRef.current) return
    // Nothing worth saving yet — also avoids clobbering saved state on mount.
    if (solvedMap.size === 0 && points === 0 && currentChapterIndex === 0 && currentMoveIndex <= -1) return
    try {
      const payload: SavedBlockProgress = {
        savedAt: Date.now(),
        chapterIndex: currentChapterIndex,
        moveIndex: currentMoveIndex,
        solved: Array.from(solvedMap.entries()),
        points,
      }
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {}
  }, [storageKey, currentChapterIndex, currentMoveIndex, solvedMap, points])

  // ── Parse PGN when chapter changes ───────────────────────────────────────
  useEffect(() => {
    if (!currentChapter?.pgn) {
      setParsedMoves([])
      setFenHistory([FEN_START])
      setHeaders({})
      setCurrentMoveIndex(-1)
      setCustomHighlights({})
      clearSolveState()
      return
    }

    const parsed = parsePgn(currentChapter.pgn)

    const moves: ParsedMove[] = parsed.moves.map((move, index) => {
      const game = new Chess()
      for (let i = 0; i <= index; i++) {
        try { game.move(parsed.moves[i].san) } catch { break }
      }
      const history = game.history({ verbose: true }) as Move[]
      const last    = history[history.length - 1]
      return {
        ...last,
        moveNumber: Math.floor(index / 2) + 1,
        comment: move.comment,
        clock:   move.clock,
        eval:    move.eval,
        arrows:  move.arrows,
        highlights: move.highlights,
        nag:     move.nag,
      } as ParsedMove
    })

    setParsedMoves(moves)
    setFenHistory(buildFenHistory(moves))
    setHeaders(parsed.headers)
    // Restored refresh target for this chapter wins over the default reset.
    const pending = pendingRestoreRef.current
    if (pending && pending.chapter === currentChapterIndex) {
      pendingRestoreRef.current = null
      setCurrentMoveIndex(Math.min(pending.move, moves.length - 1))
    } else {
      setCurrentMoveIndex(-1)
    }
    setCustomHighlights({})
    clearSolveState()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterIndex, currentChapter?.pgn])

  // ── Scroll active move into view ──────────────────────────────────────────
  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentMoveIndex])

  // ── Derived solve values ──────────────────────────────────────────────────
  const chapterSolveMoves = currentChapter?.solveMoves || []

  const nextUnsolved = useMemo(
    () => chapterSolveMoves.find(sp => !solvedMap.has(`${currentChapterIndex}:${sp.moveIndex}`)),
    [chapterSolveMoves, solvedMap, currentChapterIndex]
  )

  const isSolveMode  = nextUnsolved != null && currentMoveIndex === nextUnsolved.moveIndex - 1
  const maxNavIndex  = nextUnsolved ? nextUnsolved.moveIndex - 1 : parsedMoves.length - 1
  const visibleUpTo  = nextUnsolved ? nextUnsolved.moveIndex : parsedMoves.length - 1
  const boardFen     = fenHistory[currentMoveIndex + 1] ?? fenHistory[0]

  // ── Square styles ─────────────────────────────────────────────────────────
  const legalMoves = useMemo(() => {
    if (!selectedSquare || !isSolveMode) return []
    const game  = new Chess(boardFen)
    const moves = game.moves({ square: selectedSquare as any, verbose: true }) as Move[]
    return moves.map(m => m.to)
  }, [selectedSquare, boardFen, isSolveMode])

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    if (showHighlights && !isSolveMode) {
      const move = parsedMoves[currentMoveIndex]
      if (move?.highlights) {
        move.highlights.forEach(h => {
          const color = HIGHLIGHT_RENDER_COLOR[h.color ?? 'G']
          for (const sq of (h.squares ?? [h.square])) styles[sq] = { backgroundColor: color }
        })
      }
    }

    if (lastMove) {
      const color = wrongMoveMade
        ? 'rgba(148, 163, 184, 0.5)'   // slate for wrong (not red)
        : 'rgba(255, 170, 0, 0.5)'
      styles[lastMove.from] = { backgroundColor: color }
      styles[lastMove.to]   = { backgroundColor: color }
    } else if (!isSolveMode && currentMoveIndex >= 0) {
      const m = parsedMoves[currentMoveIndex]
      if (m) {
        styles[m.from] = { backgroundColor: 'rgba(255, 170, 0, 0.5)' }
        styles[m.to]   = { backgroundColor: 'rgba(255, 170, 0, 0.5)' }
      }
    }

    if (isSolveMode && selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.6)' }
      legalMoves.forEach(sq => {
        styles[sq] = { backgroundColor: 'rgba(0, 255, 0, 0.3)' }
      })
    }

    Object.entries(customHighlights).forEach(([sq, color]) => {
      styles[sq] = { backgroundColor: color }
    })

    return styles
  }, [isSolveMode, lastMove, wrongMoveMade, selectedSquare, legalMoves, currentMoveIndex,
      parsedMoves, showHighlights, customHighlights])

  const customArrows = useMemo<[string, string, string][]>(() => {
    if (!showArrows || isSolveMode) return []
    const move = parsedMoves[currentMoveIndex]
    if (!move?.arrows) return []
    return move.arrows.map(a => [a.from, a.to, ARROW_RENDER_COLOR[a.color ?? 'G']])
  }, [showArrows, isSolveMode, parsedMoves, currentMoveIndex])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function clearSolveState() {
    setSolveResult(null)
    setIllegalReason(null)
    setLastMove(null)
    setWrongMoveMade(false)
    setSelectedSquare(null)
  }

  function addPoints(delta: number) {
    setPoints(prev => prev + delta)
    setPointsDelta(delta)
    setTimeout(() => setPointsDelta(null), 1500)
  }

  // ── Solve move handler ────────────────────────────────────────────────────
  const handleSolveMove = useCallback((from: string, to: string): boolean => {
    if (!nextUnsolved) return false
    const expected = parsedMoves[nextUnsolved.moveIndex]
    if (!expected) return false

    const isMain = from === expected.from && to === expected.to
    const isAlt  = !isMain && (nextUnsolved.alternatives || []).some(
      alt => isAlternativeMatch(alt, from, to, boardFen)
    )

    if (isMain || isAlt) {
      const game   = new Chess(boardFen)
      const result = game.move({ from, to, promotion: 'q' })
      if (!result) return false

      const key = `${currentChapterIndex}:${nextUnsolved.moveIndex}`
      setSolvedMap(prev => new Map(prev).set(key, isMain ? 'main' : 'alternative'))
      setSolveResult(isMain ? 'correct' : 'alternative')
      addPoints(isMain ? POINTS_CORRECT : POINTS_ALTERNATIVE)
      if (lessonId) {
        trackInteractiveSolvePoint(lessonId, !isMain)
          .then(r => { if (r.pointsEarned > 0) onBlockComplete?.(r.pointsEarned, isMain ? 'Solve point' : 'Solve point (alt)') })
          .catch(() => {})
      }
      setLastMove({ from, to })
      setWrongMoveMade(false)
      setSelectedSquare(null)
      setIllegalReason(null)

      const solvedIdx    = nextUnsolved.moveIndex
      setCurrentMoveIndex(solvedIdx)

      const nextIdx         = solvedIdx + 1
      const nextIsSolvePoint = chapterSolveMoves.some(sp => sp.moveIndex === nextIdx)
      if (nextIdx < parsedMoves.length && !nextIsSolvePoint) {
        setTimeout(() => {
          setCurrentMoveIndex(nextIdx)
          setSolveResult(null)
          setLastMove(null)
        }, 900)
      } else {
        setTimeout(() => setSolveResult(null), 1400)
      }

      return true
    }

    // Wrong move
    const game = new Chess(boardFen)
    try {
      const attempted = game.move({ from, to, promotion: 'q' })
      setIllegalReason(attempted ? 'Incorrect move. Try again.' : 'Illegal move.')
    } catch {
      setIllegalReason('Illegal move.')
    }
    setWrongMoveMade(true)
    setSolveResult('incorrect')
    setLastMove({ from, to })
    setSelectedSquare(null)
    return false
  }, [nextUnsolved, parsedMoves, boardFen, currentChapterIndex, chapterSolveMoves])

  // ── Square click ──────────────────────────────────────────────────────────
  const handleSquareClick = useCallback((square: Square) => {
    const sq = String(square)

    if (isSolveMode) {
      if (selectedSquare && legalMoves.includes(sq as Square)) {
        handleSolveMove(selectedSquare, sq)
        setSelectedSquare(null)
        return
      }
      const game  = new Chess(boardFen)
      const piece = game.get(sq as any)
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq)
        setIllegalReason(null)
      } else {
        setSelectedSquare(null)
      }
      return
    }

    setCustomHighlights(prev => {
      const next = { ...prev }
      if (next[sq]) { delete next[sq] } else { next[sq] = 'rgba(255, 255, 0, 0.5)' }
      return next
    })
  }, [isSolveMode, selectedSquare, legalMoves, boardFen, handleSolveMove])

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrev  = () => { if (currentMoveIndex > -1) { setCurrentMoveIndex(p => p - 1); clearSolveState() } }
  const handleNext  = () => { if (currentMoveIndex < maxNavIndex) { setCurrentMoveIndex(p => p + 1); clearSolveState() } }
  const handleStart = () => { setCurrentMoveIndex(-1); clearSolveState() }
  const handleEnd   = () => { setCurrentMoveIndex(maxNavIndex); clearSolveState() }

  const handleChapterChange = (index: number) => {
    setCurrentChapterIndex(index)
    setChapterDropdownOpen(false)
  }

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      handleChapterChange(currentChapterIndex + 1)
    } else {
      if (storageKey) { try { localStorage.removeItem(storageKey) } catch {} }
      onSolved()
    }
  }

  // ── Move list elements ────────────────────────────────────────────────────
  const moveElements: React.ReactNode[] = []

  for (let i = 0; i < parsedMoves.length; i++) {
    const move        = parsedMoves[i]
    const isCurrent   = i === currentMoveIndex
    const isPast      = i < currentMoveIndex
    const isSolvePoint = chapterSolveMoves.some(sp => sp.moveIndex === i)
    const solvedKey   = `${currentChapterIndex}:${i}`
    const isSolved    = solvedMap.has(solvedKey)
    const solvedHow   = solvedMap.get(solvedKey)

    if (i % 2 === 0) {
      moveElements.push(
        <span key={`mn-${i}`} className="text-[11px] text-muted-foreground font-mono select-none">
          {move.moveNumber}.
        </span>
      )
    }

    if (isSolvePoint && !isSolved && i > visibleUpTo) {
      moveElements.push(
        <span key={`move-${i}`} className="text-sm px-1 py-0.5 rounded-[2px] font-medium leading-none text-amber-500 select-none">?</span>
      )
      break
    }

    if (isSolvePoint && !isSolved && i === nextUnsolved?.moveIndex) {
      moveElements.push(
        <button
          key={`solve-${i}`}
          onClick={() => setCurrentMoveIndex(i - 1)}
          className="text-sm px-1.5 py-0.5 rounded-[2px] font-bold leading-none bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
          title="Click to attempt this move"
        >?</button>
      )
      break
    }

    moveElements.push(
      <button
        key={`move-${i}`}
        ref={isCurrent ? activeMoveRef : undefined}
        onClick={() => { if (i <= maxNavIndex) { setCurrentMoveIndex(i); clearSolveState() } }}
        disabled={i > maxNavIndex}
        className={cn(
          'text-sm px-1 py-0.5 rounded-[2px] transition-colors font-medium leading-none relative',
          isCurrent ? 'bg-amber-500 text-black'
          : isPast   ? 'text-muted-foreground'
          :             'hover:bg-slate-200 dark:hover:bg-slate-700',
          isSolved && solvedHow === 'main'        && 'after:content-["✓"] after:text-[9px] after:text-green-500 after:ml-0.5',
          isSolved && solvedHow === 'alternative' && 'after:content-["◇"] after:text-[9px] after:text-amber-500 after:ml-0.5',
        )}
      >
        {move.san}{move.nag || ''}
      </button>
    )

    if (
      move.comment &&
      !move.comment.includes('%clk') &&
      !move.comment.includes('%eval') &&
      !move.comment.includes('%cal') &&
      !move.comment.includes('%csl')
    ) {
      moveElements.push(
        <span key={`comment-${i}`} className="text-xs text-amber-700 dark:text-amber-300 italic px-1">
          {move.comment}
        </span>
      )
    }
  }

  // ── Mobile "list" view — one move-pair per row, a comment icon opens the
  // overlay instead of the inline italic text (mobile's Rich text overlay). ──
  const moveListRows: React.ReactNode[] = []
  for (let i = 0; i <= Math.min(visibleUpTo, parsedMoves.length - 1); i += 2) {
    const whiteMove = parsedMoves[i]
    const blackMove = parsedMoves[i + 1] as ParsedMove | undefined
    if (!whiteMove) break
    const moveNum = Math.floor(i / 2) + 1
    const rowComment = isDisplayableComment(blackMove?.comment) ? blackMove!.comment : (isDisplayableComment(whiteMove.comment) ? whiteMove.comment : undefined)
    const commentIdx = isDisplayableComment(blackMove?.comment) ? i + 1 : i

    moveListRows.push(
      <div key={`row-${i}`} className="flex items-center gap-1.5 px-1 py-1 border-b border-border/40 last:border-0">
        <span className="w-6 shrink-0 text-[11px] text-muted-foreground/50 font-mono">{moveNum}.</span>
        <button
          onClick={() => { if (i <= maxNavIndex) { setCurrentMoveIndex(i); clearSolveState() } }}
          disabled={i > maxNavIndex}
          className={cn('flex-1 min-w-0 text-left text-sm px-1 py-0.5 rounded-sm truncate', i === currentMoveIndex ? 'bg-amber-500 text-black' : 'hover:bg-muted disabled:opacity-40')}
        >
          {whiteMove.san}{whiteMove.nag || ''}
        </button>
        {blackMove ? (
          <button
            onClick={() => { if ((i + 1) <= maxNavIndex) { setCurrentMoveIndex(i + 1); clearSolveState() } }}
            disabled={(i + 1) > maxNavIndex}
            className={cn('flex-1 min-w-0 text-left text-sm px-1 py-0.5 rounded-sm truncate', (i + 1) === currentMoveIndex ? 'bg-amber-500 text-black' : 'hover:bg-muted disabled:opacity-40')}
          >
            {blackMove.san}{blackMove.nag || ''}
          </button>
        ) : <span className="flex-1" />}
        {rowComment && (
          <button
            onClick={() => { setCommentOverlayIdx(commentIdx); setMobileOverlay('comment') }}
            className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="View comment"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  // ── End-of-chapter state ──────────────────────────────────────────────────
  const allSolvePointsSolved = chapterSolveMoves.every(sp => solvedMap.has(`${currentChapterIndex}:${sp.moveIndex}`))
  const atEndOfChapter       = currentMoveIndex >= parsedMoves.length - 1 && allSolvePointsSolved
  const isLastChapter        = currentChapterIndex >= chapters.length - 1

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Component-scoped animations */}
      <style>{`
        @keyframes buzz {
          0%,100% { transform: translateX(0) rotate(0deg); }
          15%     { transform: translateX(-5px) rotate(-1deg); }
          30%     { transform: translateX(5px)  rotate(1deg); }
          45%     { transform: translateX(-4px); }
          60%     { transform: translateX(4px); }
          75%     { transform: translateX(-2px); }
          90%     { transform: translateX(2px); }
        }
        @keyframes deltaFloat {
          0%   { opacity: 1; transform: translateY(0)    scale(1); }
          30%  { opacity: 1; transform: translateY(-8px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.9); }
        }
      `}</style>

      {/* ── Mobile layout — board, full-width Board Controls (+ chapter-list
          toggle), chapter bar (+ list/inline toggle), and a single "stage"
          that shows either the moves or an overlay (chapters / comment /
          the current solve challenge) covering that same area. ── */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden gap-1.5">
        <div className="flex justify-center overflow-hidden shrink-0">
          <div
            className="w-full aspect-square mx-auto"
            style={{ maxWidth: 'min(100%, calc(100dvh - 22rem))', touchAction: isSolveMode ? 'none' : 'auto' }}
          >
            <Chessboard
              position={boardFen}
              onSquareClick={handleSquareClick}
              onPieceDrop={(from, to) => { if (!isSolveMode) return false; return handleSolveMove(from, to) }}
              arePiecesDraggable={isSolveMode}
              boardOrientation={currentChapter?.orientation || 'white'}
              customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
              customSquareStyles={customSquareStyles}
              customArrows={customArrows.length > 0 ? (customArrows as unknown as [Square, Square, string?][]) : undefined}
            />
          </div>
        </div>

        <div className="shrink-0"><ScoreDisplay points={points} delta={pointsDelta} /></div>

        {/* Board Controls — full width, no gaps beyond the shared 0.5 gap, no per-button borders */}
        <div className="flex gap-0.5 shrink-0">
          <TransportBtn onClick={handleStart} disabled={currentMoveIndex <= -1}><ChevronsLeft className="w-4 h-4" /></TransportBtn>
          <TransportBtn onClick={handlePrev} disabled={currentMoveIndex <= -1}><ChevronLeft className="w-4 h-4" /></TransportBtn>
          <TransportBtn onClick={handleNext} disabled={currentMoveIndex >= maxNavIndex}><ChevronRight className="w-4 h-4" /></TransportBtn>
          <TransportBtn onClick={handleEnd} disabled={currentMoveIndex >= maxNavIndex}><ChevronsRight className="w-4 h-4" /></TransportBtn>
          <TransportBtn onClick={() => setMobileOverlay(o => o === 'chapters' ? 'none' : 'chapters')} active={mobileOverlay === 'chapters'}>
            <Menu className="w-4 h-4" />
          </TransportBtn>
        </div>

        {/* Chapter bar + list/inline toggle */}
        {chapters.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setMobileOverlay(o => o === 'chapters' ? 'none' : 'chapters')}
              className="flex-1 min-w-0 flex items-center justify-between px-2 py-1.5 bg-muted rounded-sm text-xs font-medium"
            >
              <span className="truncate">{currentChapter?.name || 'Select chapter'}</span>
              <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', mobileOverlay === 'chapters' && 'rotate-180')} />
            </button>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => setMovesViewMode('list')} title="List view" className={cn('p-1.5 rounded-sm transition-colors', movesViewMode === 'list' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setMovesViewMode('inline')} title="Inline view" className={cn('p-1.5 rounded-sm transition-colors', movesViewMode === 'inline' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Stage: moves, or whichever overlay is active */}
        <div className="flex-1 min-h-0 rounded-sm bg-muted/20 border border-border overflow-hidden">
          {mobileOverlay === 'chapters' ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border shrink-0">
                <button onClick={() => setMobileOverlay('none')} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chapters</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chapters.map((chapter, index) => {
                  const chSolvePoints = chapter.solveMoves ?? []
                  const chSolvedCount = chSolvePoints.filter(sp => solvedMap.has(`${index}:${sp.moveIndex}`)).length
                  const chComplete = chSolvePoints.length > 0 && chSolvedCount === chSolvePoints.length
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => { handleChapterChange(index); setMobileOverlay('none') }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b border-border/40 last:border-0 transition-colors',
                        currentChapterIndex === index ? 'bg-foreground/5 font-medium' : 'hover:bg-muted/60'
                      )}
                    >
                      {chComplete ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <span className="w-3.5 shrink-0" />}
                      <span className="flex-1 min-w-0 truncate">{chapter.name}</span>
                      {chSolvePoints.length > 0 && (
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{chSolvedCount}/{chSolvePoints.length}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : mobileOverlay === 'comment' ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border shrink-0">
                <button onClick={() => setMobileOverlay('none')} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comment</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 italic leading-relaxed">
                  {commentOverlayIdx != null ? parsedMoves[commentOverlayIdx]?.comment : ''}
                </p>
              </div>
            </div>
          ) : isSolveMode ? (
            <div className="h-full flex flex-col items-center justify-center gap-2.5 p-4 text-center">
              <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">Your move</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">{nextUnsolved?.description || 'Find the best move'}</p>
              </div>
              <FeedbackBox result={solveResult} reason={illegalReason} />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-1.5">
              {movesViewMode === 'list'
                ? <div>{moveListRows}</div>
                : <div className="flex flex-wrap gap-x-1 gap-y-0.5">{moveElements}</div>}
            </div>
          )}
        </div>

        {/* Chapter progression — full width, no gaps, same pill-bar styling as PuzzleViewerBlock */}
        <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          <button
            onClick={handlePrev}
            disabled={currentMoveIndex <= -1 && currentChapterIndex === 0}
            className="flex-1 h-9 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          {atEndOfChapter ? (
            <button
              onClick={handleNextChapter}
              className={cn('flex-1 h-9 flex items-center justify-center gap-1 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity', !isLastChapter && 'animate-pulse')}
            >
              {isLastChapter ? 'Finish' : 'Next Chapter'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSolveMode}
              className={cn('flex-1 h-9 flex items-center justify-center gap-1 text-sm transition-colors', isSolveMode ? 'text-muted-foreground' : 'font-medium bg-foreground text-background hover:opacity-90')}
            >
              {isSolveMode ? <><Target className="w-3.5 h-3.5" />Find the move</> : <>Next<ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop layout — unchanged ── */}
      <div className="hidden lg:flex lg:flex-row gap-1 h-full overflow-hidden">

        {/* Board */}
        <div className="lg:w-[55%] flex flex-col min-w-0">
          <div className="flex justify-center overflow-hidden">
            {/* Clamp to viewport height so board + controls always fit on mobile/tablet.
                touch-action none only while solving so drag doesn't scroll the page. */}
            <div
              className="w-full aspect-square mx-auto"
              style={{ maxWidth: 'min(100%, calc(100dvh - 14rem))', touchAction: isSolveMode ? 'none' : 'auto' }}
            >
              <Chessboard
                position={boardFen}
                onSquareClick={handleSquareClick}
                onPieceDrop={(from, to) => {
                  if (!isSolveMode) return false
                  return handleSolveMove(from, to)
                }}
                arePiecesDraggable={isSolveMode}
                boardOrientation={currentChapter?.orientation || 'white'}
                customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                customSquareStyles={customSquareStyles}
                customArrows={customArrows.length > 0 ? (customArrows as unknown as [Square, Square, string?][]) : undefined}
              />
            </div>
          </div>

          {showClocks && parsedMoves[currentMoveIndex]?.clock && (
            <div className="text-center mt-0.5">
              <Badge variant="outline" className="font-mono text-[10px]">
                {parsedMoves[currentMoveIndex].clock}
              </Badge>
            </div>
          )}

          {/* Board Controls — full width, no gaps, same pill-bar styling as PuzzleViewerBlock */}
          <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden mt-1.5">
            <button onClick={handleStart} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={handlePrev} disabled={currentMoveIndex <= -1} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNext} disabled={currentMoveIndex >= maxNavIndex} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={handleEnd} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
          {Object.keys(customHighlights).length > 0 && (
            <button onClick={() => setCustomHighlights({})} className="mt-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
              Clear highlights
            </button>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:w-[45%] flex flex-col gap-1.5 min-w-0">

          {/* Score */}
          <ScoreDisplay points={points} delta={pointsDelta} />

          {/* Chapter dropdown */}
          {chapters.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setChapterDropdownOpen(!chapterDropdownOpen)}
                className="w-full flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-sm border text-xs font-medium"
              >
                <span className="truncate">{currentChapter?.name || 'Select Chapter'}</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform flex-shrink-0', chapterDropdownOpen && 'rotate-180')} />
              </button>
              {chapterDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-slate-800 border rounded-sm shadow-lg z-10 max-h-40 overflow-y-auto">
                  {chapters.map((chapter, index) => (
                    <button
                      key={chapter.id}
                      onClick={() => handleChapterChange(index)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 truncate',
                        currentChapterIndex === index && 'bg-slate-200 dark:bg-slate-600'
                      )}
                    >
                      {chapter.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Move list */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-sm p-1.5">
            {currentChapter && (
              <div className="mb-1 pb-1 border-b border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-muted-foreground truncate">
                  {headers.White && headers.Black
                    ? `${headers.White} vs ${headers.Black}${headers.Result ? ` (${headers.Result})` : ''}`
                    : currentChapter.name}
                </p>
              </div>
            )}
            <div ref={movesListRef} className="flex flex-wrap gap-x-1 gap-y-0.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {moveElements}
            </div>
          </div>

          {/* Solve prompt */}
          {isSolveMode && (
            <div className="px-3 py-2.5 rounded-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-sm flex items-start gap-2.5">
              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-0.5">
                  Your move
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
                  {nextUnsolved?.description || 'Find the best move'}
                </p>
              </div>
            </div>
          )}

          {/* Solve result feedback */}
          <FeedbackBox result={solveResult} reason={illegalReason} />

          {/* Chapter progression — full width, no gaps, same pill-bar styling as PuzzleViewerBlock */}
          <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden mt-auto">
            <button
              onClick={handlePrev}
              disabled={currentMoveIndex <= -1 && currentChapterIndex === 0}
              className="flex-1 h-9 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            {atEndOfChapter ? (
              <button
                onClick={handleNextChapter}
                className={cn('flex-1 h-9 flex items-center justify-center gap-1 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity', !isLastChapter && 'animate-pulse')}
              >
                {isLastChapter ? 'Finish' : 'Next Chapter'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isSolveMode}
                className={cn('flex-1 h-9 flex items-center justify-center gap-1 text-sm transition-colors', isSolveMode ? 'text-muted-foreground' : 'font-medium bg-foreground text-background hover:opacity-90')}
              >
                {isSolveMode ? (
                  <><Target className="w-3.5 h-3.5" />Find the move</>
                ) : (
                  <>Next<ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
