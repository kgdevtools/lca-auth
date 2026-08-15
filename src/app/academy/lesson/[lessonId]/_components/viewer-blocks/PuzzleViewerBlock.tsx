'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls } from 'framer-motion'
import { Chessboard } from 'react-chessboard'
import { Chess, type Move } from 'chess.js'
import {
  Lightbulb, RotateCcw, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Eye, SkipForward,
  ChevronsLeft, ChevronsRight, Play, Pause, MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackPuzzleBlockOutcome } from '@/services/progressService'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { successAnimation, errorAnimation, hintAnimation, tapAnimation } from '@/components/microinteractions/presets'
import {
  nextRating, DEFAULT_SEED, comboMultiplier, timerBoostFraction, clamp, PERF_MIN, PERF_MAX,
  PUZZLE_BLOCK_BASE, PUZZLE_RATING_ACTUAL,
} from '@/lib/academyRating'
import { parseSolutionMove } from '@/lib/parseSolutionMove'
import { PuzzleSetClock } from '@/components/lessons/BlockTimer'

// Auto-skip preference is a standing browser setting, not per-lesson state —
// it persists across puzzles/lessons for whoever's on this device.
const AUTO_SKIP_KEY = 'lca-academy-puzzle-auto-skip'
/** Strikes (wrong move / hint / solution view) before a puzzle is auto-marked failed. */
const MAX_ATTEMPTS_BEFORE_FAIL = 3

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
  puzzleStreak?: number
  academyRating?: number | null
  ratedCount?: number
  onRatingPreview?: (rating: number) => void
  onRatingCommit?: (rating: number) => void
  /** Flips true once when the per-block timer (LessonViewerShell) expires — routes
   *  the expiry through the same scoring path as a manual skip (a real 'timeout'
   *  outcome) instead of silently advancing with no points/rating consequence. */
  timedOut?: boolean
  /** Whole puzzle-SET countdown (one clock for the entire batch) — null when
   *  this lesson has none configured. See Lesson details → Puzzle set timer. */
  setSecondsLeft?: number | null
  setSecondsTotal?: number | null
  /** This whole lesson session is a replay of an already-completed lesson —
   *  solving still works normally, but no points/rating are granted (server
   *  enforces this independently too — see gamificationService.onPuzzleBlockSolved).
   *  Surfaced here so the UI can be honest about it instead of silently
   *  eating the reward. */
  replayLocked?: boolean
  /** For the compact mobile clock+gamification row. */
  sessionPoints?: number
  /** Mobile-only portal target in LessonViewerShell's header (same line as
   *  the lesson description) — Next/End/⋮ render there via createPortal
   *  instead of stacking below the board. Null on desktop/SSR/pre-mount,
   *  in which case this block falls back to rendering nothing extra (the
   *  lg+ control bars below the board are always visible regardless). */
  mobileControlsHost?: HTMLDivElement | null
  /** Active block's type icon (e.g. ♟) — shown inside the mobile Session
   *  chip next to the clock. Passed down rather than looked up here since
   *  the registry lookup already happens once in LessonViewerShell. */
  blockIcon?: string
}

// Points/rating-outcome tables now live in academyRating.ts as PUZZLE_BLOCK_BASE
// / PUZZLE_RATING_ACTUAL (single source of truth) — imported below as
// PUZZLE_PTS to keep this file's existing variable name.
const PUZZLE_PTS = PUZZLE_BLOCK_BASE

export default function PuzzleViewerBlock({ data, onSolved, onPrev, canPrev, lessonId, blockKey, onBlockComplete, puzzleStreak, academyRating, ratedCount, onRatingPreview, onRatingCommit, timedOut, setSecondsLeft, setSecondsTotal, replayLocked, sessionPoints, mobileControlsHost, blockIcon }: PuzzleViewerBlockProps) {
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
  // Guards scoreOutcome so it fires exactly once per attempt regardless of
  // which path reaches it first (an immediate solve vs. the Next/Skip button
  // vs. a timer expiry) — reset on Retry so a fresh attempt can score again.
  const hasScoredRef       = useRef(false)
  // Strikes toward the 3-attempts-and-you're-out rule: each wrong move, hint
  // use, or solution view counts as one, EXCEPT viewing the solution with
  // zero prior strikes — that's an instant fail (see solution button below).
  const attemptsRef        = useRef(0)
  // When this puzzle became interactive (post opponent-premove) — the clock
  // the speed bonus is measured against. Reset on retry.
  const puzzleStartRef     = useRef(Date.now())

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
  // Set once the 3-strike (or solution-cold) fail condition trips.
  const [failed, setFailed] = useState(false)
  // Combo/speed multiplier applied to the *last scored* clean solve — null
  // when there was no boost (streak/speed didn't clear a threshold), shown
  // as a small badge next to the points earned.
  const [lastBoost, setLastBoost] = useState<number | null>(null)
  // "Auto-advance on solve/fail" — a standing device preference, not per-lesson.
  const [autoSkipEnabled, setAutoSkipEnabled] = useState(false)
  useEffect(() => {
    try { setAutoSkipEnabled(localStorage.getItem(AUTO_SKIP_KEY) === '1') } catch {}
  }, [])
  const toggleAutoSkip = useCallback(() => {
    setAutoSkipEnabled(prev => {
      const next = !prev
      try { localStorage.setItem(AUTO_SKIP_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  // ── Solution viewer state ────────────────────────────────────────────────────
  const [showSolution, setShowSolution] = useState(false)
  const [solutionIndex, setSolutionIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // ── Mobile compact-controls (⋮) menu — see mobileControlsHost portal below ──
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mobileMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileMenuOpen])

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
  // Also marks the moment the puzzle actually becomes interactive — the
  // clock the speed bonus is measured against — so premove animation time
  // never counts against the student.
  useEffect(() => {
    if (!isLichessFmt || !solution[0]) {
      puzzleStartRef.current = Date.now()
      return
    }
    const parsed = parseSolutionMove(solution[0], startFen)
    if (!parsed) {
      puzzleStartRef.current = Date.now()
      return
    }

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
      puzzleStartRef.current = Date.now()
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

  // Classifies a *solved* attempt by how much help it took — shared by the
  // solve-time scoring call and the Next-button fallback so they never disagree.
  const classifySolvedOutcome = useCallback((): 'clean' | 'wrong_first' | 'hint' | 'hint_wrong' => {
    if (hadWrongMoveRef.current && usedHintRef.current) return 'hint_wrong'
    if (usedHintRef.current) return 'hint'
    if (hadWrongMoveRef.current) return 'wrong_first'
    return 'clean'
  }, [])

  // ── Score an outcome — fires exactly once per attempt (guarded), and as
  // soon as the outcome is known rather than deferred to the Next click, so
  // the student sees rating/points move the instant they solve (or skip). ──
  const scoreOutcome = useCallback((outcome: 'clean' | 'wrong_first' | 'hint' | 'hint_wrong' | 'gave_up' | 'timeout') => {
    if (hasScoredRef.current) return
    hasScoredRef.current = true

    // Replaying an already-completed lesson earns nothing — skip the boost
    // math, the rating preview, and the network call entirely. The server
    // would zero it out anyway (gamificationService.onPuzzleBlockSolved
    // re-checks lesson_progress independently), but there's no reason to
    // even ask, and this keeps the UI from flashing a reward that never lands.
    if (replayLocked) {
      onBlockComplete?.(0, `Puzzle — ${outcome.replace(/_/g, ' ')}`)
      return
    }

    const base = PUZZLE_PTS[outcome] ?? 0
    const ratingActual = PUZZLE_RATING_ACTUAL[outcome] ?? 0
    const ratingBeforeThisAttempt = academyRating

    // Combo/speed boost — mirrors gamificationService.ts's server-side calc
    // (same shared functions) for an instant, accurate preview; the server
    // recomputes it from the same comboStreak/elapsedSeconds rather than
    // trusting a client-sent multiplier. Only a clean solve ever earns it.
    const elapsedSeconds = (Date.now() - puzzleStartRef.current) / 1000
    const comboStreak = outcome === 'clean' ? (puzzleStreak ?? 0) + 1 : 0
    const boost = outcome === 'clean'
      ? comboMultiplier(comboStreak) * (1 + timerBoostFraction(elapsedSeconds))
      : 1
    const pts = base > 0 ? Math.round(base * boost) : 0
    setLastBoost(boost > 1 ? boost : null)

    if (lessonId && blockKey) {
      // Optimistic preview: show the projected rating instantly using the same
      // pure Elo step (boosted the same way) the server uses; reconciled with
      // the real value below.
      if (ratingBeforeThisAttempt != null) {
        const opponentR = data.rating ?? ratingBeforeThisAttempt ?? DEFAULT_SEED
        const plainNext = nextRating(ratingBeforeThisAttempt, opponentR, ratingActual, ratedCount ?? 0)
        const boostedNext = boost === 1
          ? plainNext
          : clamp(Math.round(ratingBeforeThisAttempt + (plainNext - ratingBeforeThisAttempt) * boost), PERF_MIN, PERF_MAX)
        onRatingPreview?.(boostedNext)
      }
      trackPuzzleBlockOutcome(
        lessonId, outcome as Parameters<typeof trackPuzzleBlockOutcome>[1], blockKey, data.rating ?? null,
        comboStreak, elapsedSeconds,
      )
        .then(r => {
          if (r.rating) {
            onRatingCommit?.(r.rating.after)
          } else if (ratingBeforeThisAttempt != null) {
            // Server withheld the update (already rated today) — snap the
            // optimistic preview back to the real value instead of leaving
            // a number on screen that never actually persisted.
            onRatingPreview?.(ratingBeforeThisAttempt)
          }
        })
        .catch(() => {})
    }
    // Always report to the breakdown — including 0-pt outcomes — so the final
    // report is honest about what happened to every puzzle, not just the ones
    // that paid out (a run of silent gave_up/timeout entries used to just
    // vanish from the session total with no trace).
    onBlockComplete?.(pts, `Puzzle — ${outcome.replace(/_/g, ' ')}`)
  }, [lessonId, blockKey, onBlockComplete, academyRating, ratedCount, onRatingPreview, onRatingCommit, data.rating, puzzleStreak, replayLocked])

  // ── 3-strikes-and-you're-out ─────────────────────────────────────────────────
  // Marks the puzzle failed (same scoring path as a manual skip) and, when the
  // "auto-skip" preference is on, advances automatically after a beat so the
  // student sees the failed state register before the board moves on.
  const triggerFail = useCallback(() => {
    if (isSolvedRef.current || hasScoredRef.current) return
    setFailed(true)
    setShowResult('incorrect')
    scoreOutcome('gave_up')
    if (autoSkipEnabled) setTimeout(() => onSolved(), 900)
  }, [scoreOutcome, autoSkipEnabled, onSolved])

  // Counts one strike (wrong move / hint / solution view) toward the fail
  // threshold — called from those three places below.
  const registerAttempt = useCallback(() => {
    if (isSolvedRef.current || failed) return
    attemptsRef.current += 1
    if (attemptsRef.current >= MAX_ATTEMPTS_BEFORE_FAIL) triggerFail()
  }, [failed, triggerFail])

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
            scoreOutcome(classifySolvedOutcome())
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
                    scoreOutcome(classifySolvedOutcome())
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
    registerAttempt()
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
    hasScoredRef.current = false
    attemptsRef.current = 0
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
    setFailed(false)
    setLastBoost(null)
    setRetryCount(c => c + 1)
  }, [startFen])

  // Shared by the desktop puzzle-controls bar and the mobile ⋮ menu — same
  // handler, same strike/fail bookkeeping, just two different buttons calling it.
  const handleHintClick = useCallback(() => {
    if (!usedHintRef.current) { usedHintRef.current = true; registerAttempt() }
    setShowHint(true)
  }, [registerAttempt])

  const handleToggleSolution = useCallback(() => {
    // Only the transition *into* solution view counts as a strike — and
    // viewing it cold (zero prior strikes: no wrong move, no hint) is an
    // instant fail, not just +1 toward the threshold.
    if (!showSolution && !isSolvedRef.current) {
      showedSolutionRef.current = true
      if (attemptsRef.current === 0) { attemptsRef.current = MAX_ATTEMPTS_BEFORE_FAIL; triggerFail() }
      else registerAttempt()
    }
    setShowSolution(p => !p); setSolutionIndex(0); setIsPlaying(false)
  }, [showSolution, registerAttempt, triggerFail])

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

  // Called from Skip / Next buttons in place of onSolved directly. The actual
  // scoring already happened the instant the puzzle was solved (see
  // scoreOutcome calls in handleMove) — scoreOutcome's own guard makes this
  // a no-op in that case; this is only the *first* scoring call when the
  // student skips without solving.
  const handleBlockComplete = useCallback(() => {
    scoreOutcome(isSolvedRef.current ? classifySolvedOutcome() : 'gave_up')
    onSolved()
  }, [scoreOutcome, classifySolvedOutcome, onSolved])

  // Timer expiry (LessonViewerShell's per-block countdown) routes through the
  // same scoring path as a manual skip — a real 'timeout' outcome — instead
  // of silently advancing with no points/rating consequence.
  useEffect(() => {
    if (!timedOut || isSolvedRef.current) return
    scoreOutcome('timeout')
    onSolved()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut])

  return (
    <div className="flex flex-col lg:flex-row gap-1 h-full overflow-hidden">
      {/* Board column — 15% larger than an even split on desktop; the panel
          column below gives up the matching 15% so the row still sums to 100%.
          order-2: on mobile this sits between the compact clock/gamification
          row and board controls, so the whole "playable" stack (clock, board,
          controls) fits one screen without scrolling — see the mobile-only
          order-* classes throughout this component's right panel. */}
      <div className="lg:w-[57.5%] flex flex-col min-w-0 order-2 lg:order-none">
        <div className="flex justify-center overflow-hidden">
          {/* Clamp to viewport height so board + actions always fit on mobile/tablet;
              the lg cap is 15% larger than the mobile/tablet one. */}
          <div
            className="w-full aspect-square mx-auto max-w-[min(100%,calc(100dvh_-_14rem))] lg:max-w-[min(100%,calc((100dvh_-_14rem)*1.15))]"
          >
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

      {/* Right panel — see board column comment re: the 57.5/42.5 split.
          `contents` on mobile: this wrapper disappears from the box model so
          its children become direct flex items of the outer row alongside
          the board column, letting the order-* classes below interleave
          them (compact clock/gamification → board → board controls → the
          rest). Restored to a real flex column at lg, matching desktop's
          existing side-by-side layout exactly as before. */}
      <div className="contents lg:flex lg:flex-col lg:w-[42.5%] lg:gap-1 lg:min-w-0">
        {/* Mobile-only compact clock + gamification line — one line, tight
            spacing, sits above the board so the whole playable stack (this +
            board + board controls) fits one screen without scrolling.
            Desktop keeps using the big fill-space clock further down. */}
        <div className="order-1 lg:hidden flex items-center gap-1 tracking-tight leading-none">
          {setSecondsTotal != null && setSecondsLeft != null && (
            <PuzzleSetClock secondsLeft={setSecondsLeft} secondsTotal={setSecondsTotal} className="shrink-0" />
          )}
          {/* Session data — block icon, rating, combo streak, points earned so
              far this session. h-8 matches the clock chip next to it exactly,
              so the two sit flush regardless of how much content either has. */}
          <div className={cn(
            'flex-1 min-w-0 h-8 flex items-center justify-center gap-2 px-2 rounded-sm border',
            replayLocked ? 'bg-muted/40 border-border opacity-60' : 'bg-slate-900 dark:bg-slate-950 border-slate-700',
          )}>
            {blockIcon && (
              <span className="text-sm leading-none shrink-0" aria-hidden="true">{blockIcon}</span>
            )}
            {academyRating != null && (
              <span className={cn('text-xs font-bold tabular-nums tracking-tighter shrink-0', replayLocked ? 'text-muted-foreground' : 'text-amber-400')}>
                ★{academyRating}
              </span>
            )}
            {(puzzleStreak ?? 0) > 1 && (
              <span className={cn('flex items-center gap-0.5 text-xs font-bold tabular-nums tracking-tighter shrink-0', replayLocked ? 'text-muted-foreground' : 'text-amber-400')}>
                🎯{puzzleStreak}
              </span>
            )}
            <span className={cn('text-xs font-bold tabular-nums tracking-tighter shrink-0', replayLocked ? 'text-muted-foreground' : 'text-white')}>
              +{sessionPoints ?? 0}
            </span>
            {replayLocked && (
              <span className="text-[8px] uppercase tracking-tight text-muted-foreground leading-none truncate">Not counted</span>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="order-4 lg:order-none flex flex-col gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium shrink-0">
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
          <div className="order-4 lg:order-none flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">Correct! Well done!</span>
            </div>
            {replayLocked ? (
              <span className="text-[10px] font-medium text-muted-foreground">Replay — no points</span>
            ) : (() => {
              const outcome = classifySolvedOutcome()
              const base = PUZZLE_PTS[outcome] ?? 0
              const pts = lastBoost ? Math.round(base * lastBoost) : base
              const halved = outcome === 'wrong_first' || outcome === 'hint' || outcome === 'hint_wrong'
              return pts > 0 ? (
                <span className="text-xs font-bold text-green-700 dark:text-green-300">
                  +{pts} pts
                  {halved && <span className="font-normal text-green-700/70 dark:text-green-300/70"> (reduced)</span>}
                  {lastBoost && <span className="font-normal text-amber-600 dark:text-amber-400"> · {lastBoost.toFixed(2)}× boost 🔥</span>}
                </span>
              ) : null
            })()}
          </div>
        )}

        {feedback && !isSolved && !showSolution && (
          <div className="order-4 lg:order-none flex items-center gap-2 px-2 py-1.5 rounded bg-red-50 dark:bg-red-900/20 shrink-0">
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-300">{feedback}</span>
          </div>
        )}

        {/* Hint */}
        {showHint && data.hint && !showSolution && (
          <div className="order-4 lg:order-none flex items-start gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {data.hint}
          </div>
        )}

        {/* Puzzle controls — icon-only, board-control style. Desktop only:
            on mobile these same actions live in the compact Next/End/⋮
            cluster portaled up next to the lesson description instead (see
            mobileControlsHost below) — no longer stacked below the board. */}
        <div className="order-4 lg:order-none hidden lg:flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
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
            onClick={handleHintClick}
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
            onClick={handleToggleSolution}
            disabled={isSolved}
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
            onClick={toggleAutoSkip}
            title={autoSkipEnabled ? 'Auto-skip: on — failed/solved puzzles advance automatically' : 'Auto-skip: off — click Next to advance'}
            aria-label="Toggle auto-skip"
            aria-pressed={autoSkipEnabled}
            className={cn(
              'flex-1 h-10 flex items-center justify-center transition-colors',
              autoSkipEnabled ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <SkipForward className="w-4 h-4" />
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

        {/* Failed banner — 3-strike or solution-without-attempt fail */}
        {failed && !isSolved && (
          <div className="order-4 lg:order-none flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-red-100 dark:bg-red-900/30 shrink-0">
            <div className="flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                Puzzle failed{autoSkipEnabled ? ' — moving on…' : ' — retry or click Next'}
              </span>
            </div>
          </div>
        )}

        {/* Solution moves list */}
        {showSolution && (
          <div className="order-4 lg:order-none overflow-y-auto bg-slate-100 dark:bg-slate-800 rounded p-1.5 min-h-[60px] max-h-[100px]">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {solutionMoveElements}
            </div>
          </div>
        )}

        {/* Fills remaining vertical space so Board controls sits flush with
            the board's bottom edge on desktop — whether or not this lesson
            has a set timer. Desktop only: mobile uses the compact clock +
            gamification line above the board instead (see order-1 block). */}
        {setSecondsTotal != null && setSecondsLeft != null ? (
          <PuzzleSetClock secondsLeft={setSecondsLeft} secondsTotal={setSecondsTotal} size="large" className="hidden lg:flex lg:order-none" />
        ) : (
          <div className="hidden lg:flex lg:flex-1 lg:min-h-0 lg:order-none" />
        )}

        {/* Board controls (solution move scrubber) — always visible on
            desktop; on mobile only once Solution has actually been opened
            (the compact End button / ⋮ → Solution menu item are the entry
            points there instead — see mobileControlsHost portal below).
            order-3: right after the board on mobile, so clock+board+controls
            all fit one screen without scrolling. */}
        <div className={cn(
          'order-3 lg:order-none bg-card border border-border rounded-sm shadow-sm shrink-0 lg:flex',
          showSolution ? 'flex' : 'hidden',
        )}>
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

      {/* Mobile compact controls (Next / End / ⋮ Previous·Retry·Hint·Solution·
          Auto-skip) — portaled up next to the lesson description on mobile;
          same handlers/state as the desktop bars above, just reachable from
          one line instead of stacked below the board. No-op on desktop or
          before the host div has mounted. */}
      {mobileControlsHost && createPortal(
        <div className="flex items-center gap-1">
          <button
            onClick={handleBlockComplete}
            title={isSolved ? 'Next puzzle' : 'Skip puzzle'}
            aria-label={isSolved ? 'Next puzzle' : 'Skip puzzle'}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-sm transition-colors',
              isSolved ? 'bg-foreground text-background hover:opacity-90' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleSolEnd}
            disabled={!hasAttempted || solutionIndex >= solutionFenHistory.length - 1}
            title="Jump to solution"
            aria-label="Jump to solution"
            className="h-9 w-9 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(p => !p)}
              title="More puzzle controls"
              aria-label="More puzzle controls"
              aria-expanded={mobileMenuOpen}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-sm transition-colors',
                mobileMenuOpen ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-sm shadow-lg z-50 overflow-hidden py-1">
                {onPrev !== undefined && (
                  <button
                    onClick={() => { onPrev(); setMobileMenuOpen(false) }}
                    disabled={!canPrev}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" /> Previous puzzle
                  </button>
                )}
                <button
                  onClick={() => { handleRetry(); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" /> Retry
                </button>
                <button
                  onClick={() => { handleHintClick(); setMobileMenuOpen(false) }}
                  disabled={!data.hint || isSolved || showSolution}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <Lightbulb className="w-4 h-4 shrink-0" /> Hint
                </button>
                <button
                  onClick={() => { handleToggleSolution(); setMobileMenuOpen(false) }}
                  disabled={isSolved}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-30',
                    showSolution ? 'text-foreground bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Eye className="w-4 h-4 shrink-0" /> Solution
                </button>
                <button
                  onClick={() => { toggleAutoSkip(); setMobileMenuOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    autoSkipEnabled ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <SkipForward className="w-4 h-4 shrink-0" /> Auto-skip {autoSkipEnabled ? '(on)' : '(off)'}
                </button>
              </div>
            )}
          </div>
        </div>,
        mobileControlsHost
      )}
    </div>
  )
}
