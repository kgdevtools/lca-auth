'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import { Chessboard } from 'react-chessboard'
import { Chess, type Move } from 'chess.js'
import {
  Lightbulb, RotateCcw, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Eye, Zap,
  ChevronsLeft, ChevronsRight, Play, Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackPuzzleBlockOutcome } from '@/services/progressService'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { successAnimation, errorAnimation, hintAnimation, tapAnimation } from '@/components/microinteractions/presets'
import { nextRating, DEFAULT_SEED } from '@/lib/academyRating'
import { parseSolutionMove } from '@/lib/parseSolutionMove'

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
  blockKey?: string
  onBlockComplete?: (pts: number, label: string) => void
  sessionPoints?: number
  puzzleStreak?: number
  studentLevel?: number
  studentLevelName?: string
  currentStreak?: number
  academyRating?: number | null
  ratedCount?: number
  onRatingPreview?: (rating: number) => void
  onRatingCommit?: (rating: number) => void
}

const LEVEL_ICONS: Record<number, string> = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

const PUZZLE_PTS: Record<string, number> = { clean: 10, wrong_first: 7, hint: 5, hint_wrong: 4, gave_up: 0 }
// Mirrors the server's PUZZLE_RATING_ACTUAL (gamificationService.ts) so the client can
// preview the Elo step instantly; the server call reconciles the real persisted value.
const PUZZLE_RATING_ACTUAL: Record<string, number | null> = {
  clean: 1, wrong_first: 1, hint: 1, hint_wrong: 0.5, gave_up: null,
}

export default function PuzzleViewerBlock({ data, onSolved, onPrev, canPrev, lessonId, blockKey, onBlockComplete, sessionPoints, puzzleStreak, studentLevel, studentLevelName, currentStreak, academyRating, ratedCount, onRatingPreview, onRatingCommit }: PuzzleViewerBlockProps) {
  const startFen = data.fen || ''
  const solution = data.solution || []

  const { spring, reduced } = useMotionProfile()
  const boardControls = useAnimationControls()

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
            boardControls.start(successAnimation(spring, reduced))
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
                    boardControls.start(successAnimation(spring, reduced))
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
    boardControls.start(errorAnimation(reduced))
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
    const ratingActual = PUZZLE_RATING_ACTUAL[outcome]

    if (lessonId && blockKey && outcome !== 'gave_up') {
      // Optimistic preview: show the projected rating instantly using the same
      // pure Elo step the server uses; reconciled with the real value below.
      if (ratingActual !== null && academyRating != null) {
        const opponentR = data.rating ?? academyRating ?? DEFAULT_SEED
        onRatingPreview?.(nextRating(academyRating, opponentR, ratingActual, ratedCount ?? 0))
      }
      trackPuzzleBlockOutcome(lessonId, outcome as Parameters<typeof trackPuzzleBlockOutcome>[1], blockKey, data.rating ?? null)
        .then(r => { if (r.rating) onRatingCommit?.(r.rating.after) })
        .catch(() => {})
    }
    if (pts > 0) {
      onBlockComplete?.(pts, `Puzzle — ${outcome.replace(/_/g, ' ')}`)
    }
    onSolved()
  }, [lessonId, blockKey, onBlockComplete, onSolved, academyRating, ratedCount, onRatingPreview, onRatingCommit, data.rating])

  return (
    <div className="flex flex-col lg:flex-row gap-1 h-full overflow-hidden">
      {/* Board column */}
      <div className="lg:w-1/2 flex flex-col min-w-0">
        <div className="flex justify-center overflow-hidden">
          {/* Clamp to viewport height so board + actions always fit on mobile/tablet */}
          <div className="w-full aspect-square mx-auto" style={{ maxWidth: 'min(100%, calc(100dvh - 14rem))' }}>
            <motion.div
              animate={boardControls}
              onMouseDown={handleBoardMouseDown}
              onMouseUp={handleBoardMouseUp}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full"
              // While solving, stop touch-drag from scrolling the page (board jitter on mobile)
              style={{ touchAction: showSolution || isSolved ? 'auto' : 'none' }}
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
                animationDuration={350}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:w-1/2 flex flex-col gap-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Tactics Puzzle</span>
            {data.rating && (
              <span className="font-mono shrink-0">★ {data.rating}</span>
            )}
          </div>
          {isSolved && data.themes && data.themes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.themes.map(theme => (
                <span
                  key={theme}
                  className="text-[10px] font-normal text-muted-foreground bg-background/60 border border-border rounded-sm px-1.5 py-0.5"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
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

        {/* Puzzle controls — icon-only, board-control style */}
        <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          {onPrev !== undefined && (
            <button
              onClick={onPrev}
              disabled={!canPrev}
              title="Previous puzzle"
              aria-label="Previous puzzle"
              className="flex-1 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleRetry}
            title="Retry puzzle"
            aria-label="Retry puzzle"
            className="flex-1 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <motion.button
            onClick={() => { setShowHint(true); usedHintRef.current = true }}
            disabled={!data.hint || isSolved || showSolution}
            whileTap={tapAnimation(reduced)}
            animate={!showHint && data.hint && !isSolved && !showSolution ? hintAnimation(reduced) : undefined}
            title="Hint"
            aria-label="Hint"
            className="flex-1 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
          </motion.button>
          <button
            onClick={() => { showedSolutionRef.current = true; setShowSolution(p => !p); setSolutionIndex(0); setIsPlaying(false) }}
            disabled={!hasAttempted}
            title="Solution"
            aria-label="Solution"
            className={cn(
              'flex-1 h-10 flex items-center justify-center transition-colors disabled:opacity-30',
              showSolution ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleBlockComplete}
            title={isSolved ? 'Next puzzle' : 'Skip puzzle'}
            aria-label={isSolved ? 'Next puzzle' : 'Skip puzzle'}
            className={cn(
              'flex-1 h-10 flex items-center justify-center transition-colors',
              isSolved ? 'bg-foreground text-background hover:opacity-90' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Solution moves list */}
        {showSolution && (
          <div className="overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded p-1.5 min-h-[60px] max-h-[100px]">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {solutionMoveElements}
            </div>
          </div>
        )}

        {/* Gamification panel — desktop only, sits above board controls */}
        <div className="hidden lg:flex flex-col gap-1.5 shrink-0 mt-auto">
          <div className="flex items-center justify-between px-3 py-2 bg-foreground text-background border border-transparent rounded-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none select-none">
                {LEVEL_ICONS[studentLevel ?? 1] ?? '♟'}
              </span>
              <div className="flex flex-col gap-px leading-none">
                <span className="text-[9px] font-medium text-background/60 uppercase tracking-wider">
                  Level {studentLevel ?? 1}
                </span>
                <span className="text-xs font-bold">{studentLevelName ?? 'Pawn'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {academyRating != null && (
                <div className="flex flex-col items-end gap-px leading-none" title="Academy rating">
                  <span className="text-[9px] font-medium text-background/60 uppercase tracking-wider">Rating</span>
                  <span className="text-xs font-bold text-amber-400 tabular-nums">{academyRating}</span>
                </div>
              )}
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
