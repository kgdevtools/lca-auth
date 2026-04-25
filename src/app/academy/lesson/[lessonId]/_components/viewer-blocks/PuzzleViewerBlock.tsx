'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Chessboard } from 'react-chessboard'
import { Chess, type Move } from 'chess.js'
import { Button } from '@/components/ui/button'
import {
  Lightbulb, RotateCcw, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Eye, Zap,
  ChevronsLeft, ChevronsRight, Play, Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackPuzzleBlockOutcome } from '@/services/progressService'

interface PuzzleViewerBlockProps {
  data: {
    fen?: string
    solution?: string[]
    hint?: string
    rating?: number | null
    themes?: string[]
    orientation?: 'white' | 'black'
  }
  onSolved: () => void
  onPrev?: () => void
  canPrev?: boolean
  lessonId?: string
  onBlockComplete?: (pts: number, label: string) => void
  sessionPoints?: number
  puzzleStreak?: number
  studentLevel?: number
  studentLevelName?: string
  currentStreak?: number
}

const LEVEL_ICONS: Record<number, string> = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

// Accepts dashed UCI ("h3-g4"), plain UCI ("g7g5"/"e7e8q"), or SAN ("Qf2","Re8","O-O")
function parseSolutionMove(raw: string, fen: string): { from: string; to: string } | null {
  const t = raw.trim()

  if (/^[a-h][1-8]-[a-h][1-8]$/.test(t)) {
    const [f, to] = t.split('-')
    return { from: f, to }
  }

  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t)) {
    return { from: t.slice(0, 2), to: t.slice(2, 4) }
  }

  try {
    const g = new Chess(fen)
    const m = g.move(t)
    if (m) return { from: m.from, to: m.to }
  } catch {}

  return null
}

const PUZZLE_PTS: Record<string, number> = { clean: 10, wrong_first: 7, hint: 5, hint_wrong: 4, gave_up: 0 }

export default function PuzzleViewerBlock({ data, onSolved, onPrev, canPrev, lessonId, onBlockComplete, sessionPoints, puzzleStreak, studentLevel, studentLevelName, currentStreak }: PuzzleViewerBlockProps) {
  const startFen = data.fen || ''
  const solution = data.solution || []

  // ── Puzzle-solving refs (never stale in handlers) ────────────────────────────
  const positionRef = useRef(startFen)
  const moveIndexRef = useRef(0)
  const isSolvedRef = useRef(false)
  const isBoardMovingRef = useRef(false)

  // ── Outcome tracking refs ────────────────────────────────────────────────────
  const usedHintRef        = useRef(false)
  const hadWrongMoveRef    = useRef(false)
  const showedSolutionRef  = useRef(false)

  // ── Arrow drawing refs ───────────────────────────────────────────────────────
  const hoverSquareRef = useRef<string | null>(null)
  const rightDragFromRef = useRef<string | null>(null)
  const wasDragRef = useRef(false)

  // ── Puzzle visual state ──────────────────────────────────────────────────────
  const [displayPosition, setDisplayPosition] = useState(startFen)
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [wrongMove, setWrongMove] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [customHighlights, setCustomHighlights] = useState<Record<string, string>>({})
  const [boardMoving, setBoardMoving] = useState(false)
  const [customArrows, setCustomArrows] = useState<[string, string, string?][]>([])

  // ── Solution viewer state ────────────────────────────────────────────────────
  const [showSolution, setShowSolution] = useState(false)
  const [solutionIndex, setSolutionIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // If orientation is explicitly set the FEN is already at the student's move (manually-created puzzle).
  // Otherwise assume Lichess format where solution[0] is the opponent's pre-move.
  const isLichessFmt = !data.orientation
  const boardOrientation: 'white' | 'black' = data.orientation ?? (startFen.split(' ')[1] === 'b' ? 'white' : 'black')
  const playerColor: 'w' | 'b' = data.orientation
    ? (data.orientation === 'white' ? 'w' : 'b')
    : (startFen.split(' ')[1] === 'w' ? 'b' : 'w')

  const currentGame = useMemo(() => new Chess(displayPosition), [displayPosition])

  // Build FEN history + SAN list for all solution positions.
  // solution[] may contain UCI ("g7g5") or SAN ("Nf3"); we always store result.san for display.
  const { solutionFenHistory, solutionSANs } = useMemo(() => {
    const history = [startFen]
    const sans: string[] = []
    try {
      const g = new Chess(startFen)
      for (const raw of solution) {
        const parsed = parseSolutionMove(raw, g.fen())
        if (!parsed) break
        const result = g.move({ from: parsed.from, to: parsed.to, promotion: 'q' })
        if (!result) break
        history.push(g.fen())
        sans.push(result.san)
      }
    } catch {}
    return { solutionFenHistory: history, solutionSANs: sans }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFen, solution.join(',')])

  // Auto-play through solution
  useEffect(() => {
    if (!isPlaying || solutionIndex >= solutionFenHistory.length - 1) {
      setIsPlaying(false)
      return
    }
    const t = setTimeout(() => setSolutionIndex(p => p + 1), 800)
    return () => clearTimeout(t)
  }, [isPlaying, solutionIndex, solutionFenHistory.length])

  // Auto-play opponent's pre-move (solution[0]) on mount and after retry.
  // Skipped for manually-created puzzles where the FEN is already at the student's position.
  useEffect(() => {
    if (!isLichessFmt) return
    if (!solution[0]) return
    const parsed = parseSolutionMove(solution[0], startFen)
    if (!parsed) return

    isBoardMovingRef.current = true
    setBoardMoving(true)

    const t = setTimeout(() => {
      try {
        const game = new Chess(startFen)
        const result = game.move({ from: parsed.from, to: parsed.to, promotion: 'q' })
        if (result) {
          const newFen = game.fen()
          positionRef.current = newFen
          moveIndexRef.current = 1
          setDisplayPosition(newFen)
          setLastMove({ from: parsed.from, to: parsed.to })
        }
      } catch {}
      isBoardMovingRef.current = false
      setBoardMoving(false)
    }, 500)

    return () => {
      clearTimeout(t)
      isBoardMovingRef.current = false
      setBoardMoving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  const legalMoves = useMemo((): string[] => {
    if (!selectedSquare || showSolution) return []
    const moves = currentGame.moves({ square: selectedSquare as any, verbose: true }) as Move[]
    return moves.map(m => m.to as string)
  }, [currentGame, selectedSquare, showSolution])

  // ── Arrow drawing handlers ───────────────────────────────────────────────────
  const handleMouseOverSquare = useCallback((square: any) => {
    hoverSquareRef.current = String(square)
  }, [])

  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 && !showSolution && !isSolvedRef.current && !isBoardMovingRef.current) {
      rightDragFromRef.current = hoverSquareRef.current
      wasDragRef.current = false
    }
  }, [showSolution])

  const handleBoardMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 2 && !showSolution && !isSolvedRef.current && !isBoardMovingRef.current) {
      const from = rightDragFromRef.current
      const to = hoverSquareRef.current
      rightDragFromRef.current = null

      if (from && to && from !== to) {
        wasDragRef.current = true
        setCustomArrows(prev => {
          const exists = prev.some(([f, t]) => f === from && t === to)
          if (exists) return prev.filter(([f, t]) => !(f === from && t === to))
          return [...prev, [from, to] as [string, string]]
        })
      }
    } else {
      rightDragFromRef.current = null
    }
  }, [showSolution])

  const handleSquareRightClick = useCallback((square: any) => {
    if (!square || showSolution || isSolvedRef.current || isBoardMovingRef.current) return false
    // Skip if this was a drag (arrow already handled in mouseup)
    if (wasDragRef.current) {
      wasDragRef.current = false
      return false
    }
    const sq = String(square)
    setCustomHighlights(prev => {
      const next = { ...prev }
      if (next[sq]) { delete next[sq] } else { next[sq] = 'rgba(255,255,0,0.5)' }
      return next
    })
    return false
  }, [showSolution])

  // ── Square styles ────────────────────────────────────────────────────────────
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    if (showSolution) {
      if (solutionIndex > 0) {
        const parsed = parseSolutionMove(solution[solutionIndex - 1], solutionFenHistory[solutionIndex - 1] || startFen)
        if (parsed) {
          styles[parsed.from] = { backgroundColor: 'rgba(255,170,0,0.5)' }
          styles[parsed.to] = { backgroundColor: 'rgba(255,170,0,0.5)' }
        }
      }
      return styles
    }

    Object.entries(customHighlights).forEach(([sq, c]) => { styles[sq] = { backgroundColor: c } })

    if (wrongMove && currentGame.inCheck()) {
      const board = currentGame.board()
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          const p = board[i][j]
          if (p?.type === 'k' && p.color === currentGame.turn())
            styles[String.fromCharCode(97 + j) + (8 - i)] = { backgroundColor: '#ff4444' }
        }
      }
    }

    if (lastMove) {
      const c = wrongMove ? '#ff4444' : '#ffaa00'
      styles[lastMove.from] = { backgroundColor: c }
      styles[lastMove.to] = { backgroundColor: c }
    }

    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: '#ffff00' }
      legalMoves.forEach(sq => { styles[sq] = { backgroundColor: 'rgba(0,255,0,0.3)' } })
    }

    return styles
  }, [wrongMove, lastMove, selectedSquare, legalMoves, currentGame, customHighlights, showSolution, solutionIndex, solutionFenHistory, solution, startFen])

  const boardPosition = showSolution ? (solutionFenHistory[solutionIndex] || startFen) : displayPosition

  // ── Puzzle move handler ──────────────────────────────────────────────────────
  const handleMove = useCallback((from: string, to: string): boolean => {
    if (isSolvedRef.current || isBoardMovingRef.current) return false
    setHasAttempted(true)

    const expectedRaw = solution[moveIndexRef.current]
    if (!expectedRaw) return false

    const parsed = parseSolutionMove(expectedRaw, positionRef.current)
    if (!parsed) {
      setFeedback('Solution format error — contact coach')
      setShowResult('incorrect')
      return false
    }

    if (from === parsed.from && to === parsed.to) {
      try {
        const game = new Chess(positionRef.current)
        const result = game.move({ from, to, promotion: 'q' })
        if (result) {
          const newFen = game.fen()
          positionRef.current = newFen
          moveIndexRef.current += 1
          setDisplayPosition(newFen)
          setLastMove({ from, to })
          setFeedback(null)
          setWrongMove(false)
          setSelectedSquare(null)

          const boardResponseRaw = solution[moveIndexRef.current]

          if (!boardResponseRaw) {
            isSolvedRef.current = true
            setShowResult('correct')
          } else {
            setShowResult(null)
            isBoardMovingRef.current = true
            setBoardMoving(true)
            setTimeout(() => {
              const boardParsed = parseSolutionMove(boardResponseRaw, positionRef.current)
              if (boardParsed) {
                const boardGame = new Chess(positionRef.current)
                const boardResult = boardGame.move({ from: boardParsed.from, to: boardParsed.to, promotion: 'q' })
                if (boardResult) {
                  const boardFen = boardGame.fen()
                  positionRef.current = boardFen
                  moveIndexRef.current += 1
                  setDisplayPosition(boardFen)
                  setLastMove({ from: boardParsed.from, to: boardParsed.to })
                  if (moveIndexRef.current >= solution.length) {
                    isSolvedRef.current = true
                    setShowResult('correct')
                  }
                }
              }
              isBoardMovingRef.current = false
              setBoardMoving(false)
            }, 600)
          }
          return true
        }
      } catch (e) {
        console.error('chess.js move error:', e)
      }
    }

    hadWrongMoveRef.current = true
    setWrongMove(true)
    setShowResult('incorrect')
    setLastMove({ from, to })
    try {
      const test = new Chess(positionRef.current)
      const attempt = test.move({ from, to, promotion: 'q' })
      setFeedback(attempt ? 'Incorrect — try again!' : 'Illegal move — try again!')
    } catch {
      setFeedback('Invalid move — try again!')
    }
    return false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution.join(',')])

  const handleSquareClick = useCallback((square: any) => {
    setCustomArrows([])
    setCustomHighlights({})
    if (showSolution || isSolvedRef.current || isBoardMovingRef.current || !square) return
    const sq = String(square)

    if (selectedSquare && legalMoves.includes(sq)) {
      handleMove(selectedSquare, sq)
      setSelectedSquare(null)
      return
    }

    const piece = currentGame.get(sq as any)
    if (piece && piece.color === playerColor) {
      setSelectedSquare(sq)
      setFeedback(null)
    } else {
      setSelectedSquare(null)
    }
  }, [selectedSquare, legalMoves, currentGame, handleMove, showSolution, playerColor])

  const handleRetry = useCallback(() => {
    positionRef.current = startFen
    moveIndexRef.current = 0
    isSolvedRef.current = false
    isBoardMovingRef.current = false
    usedHintRef.current = false
    hadWrongMoveRef.current = false
    showedSolutionRef.current = false
    setBoardMoving(false)
    setDisplayPosition(startFen)
    setShowResult(null)
    setFeedback(null)
    setLastMove(null)
    setWrongMove(false)
    setSelectedSquare(null)
    setShowHint(false)
    setCustomHighlights({})
    setCustomArrows([])
    setShowSolution(false)
    setHasAttempted(false)
    setSolutionIndex(0)
    setIsPlaying(false)
    setRetryCount(c => c + 1)
  }, [startFen])

  // ── Solution navigation ──────────────────────────────────────────────────────
  const enterSolution = useCallback(() => { setShowSolution(true) }, [])
  const handleSolStart  = useCallback(() => { enterSolution(); setSolutionIndex(0); setIsPlaying(false) }, [enterSolution])
  const handleSolPrev   = useCallback(() => { enterSolution(); setSolutionIndex(p => Math.max(0, p - 1)); setIsPlaying(false) }, [enterSolution])
  const handleSolNext   = useCallback(() => { enterSolution(); setSolutionIndex(p => Math.min(solutionFenHistory.length - 1, p + 1)); setIsPlaying(false) }, [enterSolution, solutionFenHistory.length])
  const handleSolEnd    = useCallback(() => { enterSolution(); setSolutionIndex(solutionFenHistory.length - 1); setIsPlaying(false) }, [enterSolution, solutionFenHistory.length])
  const handleSolTogglePlay = useCallback(() => {
    enterSolution()
    if (solutionIndex >= solutionFenHistory.length - 1) {
      setSolutionIndex(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(p => !p)
    }
  }, [enterSolution, solutionIndex, solutionFenHistory.length])

  // ── Solution moves list elements ─────────────────────────────────────────────
  const solutionMoveElements = useMemo(() => {
    const elements: React.ReactNode[] = []
    const parts = startFen.split(' ')
    let turn = parts[1] === 'w' ? 'w' : 'b'
    let moveNum = parseInt(parts[5] || '1', 10)

    if (turn === 'b') {
      elements.push(
        <span key="mn-init" className="text-[11px] text-muted-foreground font-mono select-none">
          {moveNum}...
        </span>
      )
    }

    solution.forEach((_, i) => {
      const displaySan = solutionSANs[i] || solution[i]
      const isActive = solutionIndex === i + 1
      const isPast = solutionIndex > i + 1

      if (turn === 'w') {
        elements.push(
          <span key={`n${i}`} className="text-[11px] text-muted-foreground font-mono select-none">
            {moveNum}.
          </span>
        )
      }
      elements.push(
        <button
          key={`m${i}`}
          onClick={() => { setSolutionIndex(i + 1); setIsPlaying(false) }}
          className={cn(
            'text-sm px-1 py-0.5 rounded-[2px] transition-colors font-medium leading-none',
            isActive
              ? 'bg-amber-500 text-black'
              : isPast
              ? 'text-muted-foreground'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          {displaySan}
        </button>
      )

      if (turn === 'b') moveNum++
      turn = turn === 'w' ? 'b' : 'w'
    })

    return elements
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solution, solutionSANs, solutionIndex, startFen])

  const isSolved = showResult === 'correct'

  // Called from Skip / Next buttons in place of onSolved directly.
  const handleBlockComplete = useCallback(() => {
    const solved = isSolvedRef.current
    const outcome = solved
      ? (hadWrongMoveRef.current && usedHintRef.current) ? 'hint_wrong'
        : usedHintRef.current ? 'hint'
        : hadWrongMoveRef.current ? 'wrong_first'
        : 'clean'
      : 'gave_up'

    const pts = PUZZLE_PTS[outcome] ?? 0
    if (lessonId && outcome !== 'gave_up') {
      trackPuzzleBlockOutcome(lessonId, outcome as Parameters<typeof trackPuzzleBlockOutcome>[1]).catch(() => {})
    }
    if (pts > 0) {
      onBlockComplete?.(pts, `Puzzle — ${outcome.replace(/_/g, ' ')}`)
    }
    onSolved()
  }, [lessonId, onBlockComplete, onSolved])

  return (
    <div className="flex flex-col lg:flex-row gap-1 h-full overflow-hidden">
      {/* Board column */}
      <div className="lg:w-[45%] flex flex-col min-w-0">
        <div className="flex justify-center overflow-hidden">
          <div className="w-full aspect-square max-w-full">
            <div
              onMouseDown={handleBoardMouseDown}
              onMouseUp={handleBoardMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full"
            >
              <Chessboard
                position={boardPosition}
                onPieceDrop={handleMove}
                onSquareClick={handleSquareClick}
                onSquareRightClick={handleSquareRightClick}
                onMouseOverSquare={handleMouseOverSquare}
                boardOrientation={boardOrientation}
                customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                customSquareStyles={customSquareStyles}
                customArrows={customArrows as any}
                isDraggablePiece={({ piece }) => !showSolution && !isSolved && !boardMoving && piece[0] === playerColor}
                areArrowsAllowed={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:w-[47%] flex flex-col gap-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium shrink-0">
          <span className="font-semibold">Tactics Puzzle</span>
          <div className="flex items-center gap-2 shrink-0">
            {isSolved && data.themes && data.themes.length > 0 && (
              <span className="text-muted-foreground truncate max-w-[140px]">{data.themes.join(', ')}</span>
            )}
            {data.rating && (
              <span className="font-mono">★ {data.rating}</span>
            )}
          </div>
        </div>

        {/* Feedback */}
        {showResult === 'correct' && !showSolution && (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">Correct! Well done!</span>
            </div>
            {(() => {
              const outcome = (hadWrongMoveRef.current && usedHintRef.current) ? 'hint_wrong'
                : usedHintRef.current ? 'hint'
                : hadWrongMoveRef.current ? 'wrong_first'
                : 'clean'
              const pts = PUZZLE_PTS[outcome] ?? 0
              return pts > 0 ? (
                <span className="text-xs font-bold text-green-700 dark:text-green-300">+{pts} pts</span>
              ) : null
            })()}
          </div>
        )}

        {feedback && !isSolved && !showSolution && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-red-50 dark:bg-red-900/20 shrink-0">
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-300">{feedback}</span>
          </div>
        )}

        {/* Hint */}
        {showHint && data.hint && !showSolution && (
          <div className="flex items-start gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {data.hint}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 shrink-0">
          {!isSolved && !showSolution && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowHint(true); usedHintRef.current = true }}
              disabled={!data.hint}
              className="h-8 flex-1"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Hint
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRetry} className="h-8 flex-1">
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry
          </Button>
          <Button
            variant={showSolution ? 'default' : 'outline'}
            size="sm"
            onClick={() => { showedSolutionRef.current = true; setShowSolution(p => !p); setSolutionIndex(0); setIsPlaying(false) }}
            disabled={!hasAttempted}
            className="h-8 flex-1"
          >
            <Eye className="w-3 h-3 mr-1" />
            Solution
          </Button>
        </div>

        {/* Solution moves list */}
        {showSolution && (
          <div className="overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded p-1.5 min-h-[60px] max-h-[100px]">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {solutionMoveElements}
            </div>
          </div>
        )}

        {/* Previous / Next puzzle navigation */}
        {onPrev !== undefined && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={!canPrev}
              className="h-8 flex-1"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>
            <Button size="sm" onClick={handleBlockComplete} className="h-8 flex-1">
              {isSolved ? 'Next' : 'Skip'}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}
        {onPrev === undefined && isSolved && (
          <Button size="sm" onClick={handleBlockComplete} className="h-8 w-full shrink-0">
            Next
          </Button>
        )}

        {/* Gamification panel — desktop only, sits above board controls */}
        <div className="hidden lg:flex flex-col gap-1.5 shrink-0 mt-auto">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 dark:bg-slate-950 border border-slate-700 rounded-sm text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none select-none">
                {LEVEL_ICONS[studentLevel ?? 1] ?? '♟'}
              </span>
              <div className="flex flex-col gap-px leading-none">
                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                  Level {studentLevel ?? 1}
                </span>
                <span className="text-xs font-bold">{studentLevelName ?? 'Pawn'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(currentStreak ?? 0) > 0 && (
                <div className="flex items-center gap-1" title={`${currentStreak}-day streak`}>
                  <span className="text-base leading-none">🔥</span>
                  <span className="text-xs font-bold text-orange-400">{currentStreak}</span>
                </div>
              )}
              {(puzzleStreak ?? 0) > 1 && (
                <div className="flex items-center gap-1" title={`${puzzleStreak} puzzles in a row`}>
                  <span className="text-base leading-none">🎯</span>
                  <span className="text-xs font-bold text-amber-400">{puzzleStreak}</span>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={sessionPoints ?? 0}
              initial={{ y: -6, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-sm"
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-muted-foreground">Session pts</span>
              </div>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                +{sessionPoints ?? 0}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Board controls — always visible, clicking enters solution mode */}
        <div className="bg-card border border-border rounded-sm shadow-sm flex shrink-0">
            <button
              onClick={handleSolStart}
              disabled={solutionIndex === 0}
              className="flex-1 h-10 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleSolPrev}
              disabled={solutionIndex === 0}
              className="flex-1 h-10 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleSolTogglePlay}
              disabled={!hasAttempted}
              className="flex-1 h-10 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSolNext}
              disabled={!hasAttempted || solutionIndex >= solutionFenHistory.length - 1}
              className="flex-1 h-10 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleSolEnd}
              disabled={!hasAttempted || solutionIndex >= solutionFenHistory.length - 1}
              className="flex-1 h-10 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
      </div>
    </div>
  )
}
