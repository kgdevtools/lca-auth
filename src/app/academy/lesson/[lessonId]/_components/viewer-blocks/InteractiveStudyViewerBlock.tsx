'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { parsePgn, type ParsedPgnMove } from '@/lib/pgnParser'
import { cn } from '@/lib/utils'
import { trackInteractiveSolvePoint } from '@/services/progressService'

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
  onBlockComplete?: (pts: number, label: string) => void
}

interface ParsedMove extends Move {
  moveNumber: number
  comment?: string
  clock?: string
  eval?: string | number
  arrows?: Array<{ from: string; to: string; color: string }>
  highlights?: string[]
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveStudyViewerBlock({
  data,
  onSolved,
  lessonId,
  onBlockComplete,
}: InteractiveStudyViewerBlockProps) {
  const chapters = data.chapters || []
  const displaySettings = data.displaySettings || {}
  const showClocks    = displaySettings.showClocks    ?? true
  const showHighlights = displaySettings.showHighlights ?? true

  // ── Core navigation state ─────────────────────────────────────────────────
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentMoveIndex, setCurrentMoveIndex]       = useState(-1)
  const [parsedMoves, setParsedMoves]                 = useState<ParsedMove[]>([])
  const [fenHistory, setFenHistory]                   = useState<string[]>([FEN_START])
  const [headers, setHeaders]                         = useState<Record<string, string>>({})
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false)

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
    setCurrentMoveIndex(-1)
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
        move.highlights.forEach(sq => {
          styles[sq] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' }
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

      <div className="flex flex-col lg:flex-row gap-1 h-full overflow-hidden">

        {/* Board */}
        <div className="lg:w-[45%] flex flex-col min-w-0">
          <div className="flex justify-center overflow-hidden">
            <div className="w-full aspect-square max-w-full">
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

          <div className="flex justify-center gap-0.5 flex-wrap mt-1">
            <Button variant="outline" size="sm" onClick={handleStart} className="h-6 px-1.5">
              <ChevronsLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentMoveIndex <= -1} className="h-6 px-1.5">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentMoveIndex >= maxNavIndex} className="h-6 px-1.5">
              <ChevronRight className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleEnd} className="h-6 px-1.5">
              <ChevronsRight className="w-3 h-3" />
            </Button>
            {Object.keys(customHighlights).length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCustomHighlights({})} className="h-6 px-1.5 text-xs">Clear</Button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:w-[37%] flex flex-col gap-1.5 min-w-0">

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

          {/* Navigation */}
          <div className="flex gap-2 mt-auto">
            <Button
              onClick={handlePrev}
              variant="outline"
              size="sm"
              disabled={currentMoveIndex <= -1 && currentChapterIndex === 0}
              className="h-8 rounded-sm"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>

            {atEndOfChapter ? (
              <Button
                onClick={handleNextChapter}
                className={cn('h-8 flex-1 rounded-sm transition-all', !isLastChapter && 'animate-pulse')}
              >
                {isLastChapter ? 'Finish' : 'Next Chapter'}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isSolveMode}
                className="h-8 flex-1 rounded-sm"
                variant={isSolveMode ? 'outline' : 'default'}
              >
                {isSolveMode ? (
                  <><Target className="w-3 h-3 mr-1" />Find the move</>
                ) : (
                  <>Next<ChevronRight className="w-3 h-3 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
