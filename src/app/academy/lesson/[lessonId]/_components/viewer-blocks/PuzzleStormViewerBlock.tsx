'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Zap, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseSolutionMove } from '@/lib/parseSolutionMove'
import { savePuzzleStormScore, getPuzzleStormBest } from '@/services/puzzleStormService'
import { trackPuzzleBlockOutcome } from '@/services/progressService'

interface StormPuzzle {
  fen: string
  solution: string[]
  hint?: string
  rating?: number | null
  themes?: string[]
  orientation?: 'white' | 'black'
}

interface PuzzleStormViewerBlockProps {
  data: {
    timeLimit?: number
    puzzles?: StormPuzzle[]
  }
  lessonId?: string
  onSolved: () => void
}

type StormStatus = 'idle' | 'running' | 'finished'

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export default function PuzzleStormViewerBlock({ data, lessonId, onSolved }: PuzzleStormViewerBlockProps) {
  const puzzles = useMemo(() => data.puzzles ?? [], [data.puzzles])
  const timeLimit = data.timeLimit ?? 0
  const total = puzzles.length

  const [status, setStatus] = useState<StormStatus>('idle')
  const [personalBest, setPersonalBest] = useState<number | null>(null)

  // ── refs: never stale inside setTimeout/setInterval closures ────────────────
  const puzzleIndexRef = useRef(0)
  const moveIndexRef = useRef(0)
  const positionRef = useRef('')
  const timeElapsedRef = useRef(0)
  const solvedRef = useRef(0)
  const skippedRef = useRef(0)
  const isBoardMovingRef = useRef(false)
  const scoreSavedRef = useRef(false)

  // ── state: drives re-render ──────────────────────────────────────────────────
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [displayPosition, setDisplayPosition] = useState('')
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [flashClass, setFlashClass] = useState<'correct' | 'wrong' | null>(null)
  const [solved, setSolved] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [timeDisplay, setTimeDisplay] = useState(timeLimit)
  const [boardMoving, setBoardMoving] = useState(false)

  const currentPuzzle = puzzles[puzzleIndex]
  const boardOrientation: 'white' | 'black' = currentPuzzle?.orientation ?? 'white'
  const playerColor: 'w' | 'b' = boardOrientation === 'white' ? 'w' : 'b'
  const attempted = solved + skipped

  // Fetch personal best for the idle pre-game screen.
  useEffect(() => {
    if (!lessonId) return
    let cancelled = false
    getPuzzleStormBest(lessonId)
      .then(({ best }) => { if (!cancelled) setPersonalBest(best) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lessonId])

  const loadPuzzle = useCallback((index: number) => {
    puzzleIndexRef.current = index
    moveIndexRef.current = 0
    setPuzzleIndex(index)
    const fen = puzzles[index]?.fen ?? ''
    positionRef.current = fen
    setDisplayPosition(fen)
    setLastMove(null)
  }, [puzzles])

  const advance = useCallback(() => {
    const next = puzzleIndexRef.current + 1
    if (next >= total) {
      setStatus('finished')
    } else {
      loadPuzzle(next)
    }
  }, [total, loadPuzzle])

  const handleCorrect = useCallback(() => {
    setFlashClass('correct')
    const solvedPuzzle = puzzles[puzzleIndexRef.current]
    const blockKey = `storm-${puzzleIndexRef.current}`
    if (lessonId) {
      trackPuzzleBlockOutcome(lessonId, 'clean', blockKey, solvedPuzzle?.rating ?? null).catch(() => {})
    }
    setTimeout(() => {
      setFlashClass(null)
      solvedRef.current += 1
      setSolved(solvedRef.current)
      advance()
    }, 800)
  }, [advance, puzzles, lessonId])

  const handleWrong = useCallback(() => {
    setFlashClass('wrong')
    setTimeout(() => {
      setFlashClass(null)
      skippedRef.current += 1
      setSkipped(skippedRef.current)
      advance()
    }, 600)
  }, [advance])

  const handleSkip = useCallback(() => {
    skippedRef.current += 1
    setSkipped(skippedRef.current)
    advance()
  }, [advance])

  const handleMove = useCallback((from: string, to: string): boolean => {
    if (status !== 'running' || isBoardMovingRef.current) return false
    const puzzle = puzzles[puzzleIndexRef.current]
    if (!puzzle) return false

    const expectedRaw = puzzle.solution[moveIndexRef.current]
    if (!expectedRaw) return false

    const parsed = parseSolutionMove(expectedRaw, positionRef.current)
    if (!parsed || from !== parsed.from || to !== parsed.to) {
      handleWrong()
      return false
    }

    try {
      const game = new Chess(positionRef.current)
      const result = game.move({ from, to, promotion: 'q' })
      if (!result) {
        handleWrong()
        return false
      }

      const newFen = game.fen()
      positionRef.current = newFen
      moveIndexRef.current += 1
      setDisplayPosition(newFen)
      setLastMove({ from, to })

      const boardResponseRaw = puzzle.solution[moveIndexRef.current]
      if (!boardResponseRaw) {
        handleCorrect()
        return true
      }

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
            isBoardMovingRef.current = false
            setBoardMoving(false)
            if (moveIndexRef.current >= puzzle.solution.length) {
              handleCorrect()
            }
            return
          }
        }
        isBoardMovingRef.current = false
        setBoardMoving(false)
      }, 500)
      return true
    } catch {
      handleWrong()
      return false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, puzzles, handleCorrect, handleWrong])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'running') return
    if (timeLimit === 0) {
      const id = setInterval(() => {
        timeElapsedRef.current += 1
        setTimeDisplay(timeElapsedRef.current)
      }, 1000)
      return () => clearInterval(id)
    }
    const id = setInterval(() => {
      timeElapsedRef.current += 1
      const remaining = timeLimit - timeElapsedRef.current
      setTimeDisplay(remaining)
      if (remaining <= 0) setStatus('finished')
    }, 1000)
    return () => clearInterval(id)
  }, [status, timeLimit])

  // Solving out every puzzle in the pool also ends the storm early.
  useEffect(() => {
    if (status === 'running' && attempted >= total) setStatus('finished')
  }, [status, attempted, total])

  const startStorm = useCallback(() => {
    solvedRef.current = 0
    skippedRef.current = 0
    timeElapsedRef.current = 0
    scoreSavedRef.current = false
    setSolved(0)
    setSkipped(0)
    setTimeDisplay(timeLimit)
    setFlashClass(null)
    setStatus('running')
    loadPuzzle(0)
  }, [timeLimit, loadPuzzle])

  const tryAgain = useCallback(() => {
    setStatus('idle')
  }, [])

  // ── Score persistence ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'finished' || scoreSavedRef.current || !lessonId) return
    scoreSavedRef.current = true
    savePuzzleStormScore(lessonId, solvedRef.current, solvedRef.current + skippedRef.current, timeLimit, timeElapsedRef.current)
      .then(({ personalBest: best }) => setPersonalBest(best))
      .catch(() => {})
  }, [status, lessonId, timeLimit])

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: '#ffaa00' }
      styles[lastMove.to] = { backgroundColor: '#ffaa00' }
    }
    return styles
  }, [lastMove])

  const boardBoxShadow =
    flashClass === 'correct' ? '0 0 0 4px rgba(34,197,94,0.65)'
    : flashClass === 'wrong' ? '0 0 0 4px rgba(239,68,68,0.65)'
    : '0 4px 12px rgba(0,0,0,0.15)'

  const isLowTime = timeLimit > 0 && timeDisplay <= 60 && timeDisplay > 30
  const isCriticalTime = timeLimit > 0 && timeDisplay <= 30 && timeDisplay > 0
  const isTimeUp = timeLimit > 0 && timeDisplay <= 0

  // ── idle ──────────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
        <Zap className="w-8 h-8 text-amber-500" />
        <h1 className="text-xl font-bold tracking-tight">⚡ Puzzle Storm</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-sm border border-border text-muted-foreground font-medium">
            {total} puzzle{total === 1 ? '' : 's'}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-sm border border-border text-muted-foreground font-medium">
            {timeLimit === 0 ? '∞ Practice' : formatClock(timeLimit)}
          </span>
        </div>
        {personalBest != null && (
          <p className="text-sm text-muted-foreground">Your best: <span className="font-bold text-foreground">{personalBest}</span></p>
        )}
        <button
          onClick={startStorm}
          disabled={total === 0}
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Zap className="w-4 h-4" /> Start Storm
        </button>
      </div>
    )
  }

  // ── finished ──────────────────────────────────────────────────────────────
  if (status === 'finished') {
    const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : null
    const isNewBest = personalBest != null && solved >= personalBest
    return (
      <div className="grid grid-cols-1 md:grid-cols-[55fr_45fr] lg:grid-cols-[65fr_35fr] gap-4" style={{ height: 'calc(100vh - 50px)' }}>
        <div className="flex flex-col min-w-0">
          <div className="flex justify-center overflow-hidden">
            <div className="w-full aspect-square mx-auto" style={{ maxWidth: 'min(100%, calc(100dvh - 14rem))' }}>
              <Chessboard
                position={displayPosition}
                boardOrientation={boardOrientation}
                customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                customSquareStyles={customSquareStyles}
                isDraggablePiece={() => false}
                areArrowsAllowed={false}
                animationDuration={200}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-4 items-center justify-center text-center">
          <div>
            <p className="text-4xl font-black text-amber-500 leading-none">⚡ {solved}</p>
            <p className="text-xs text-muted-foreground mt-1">Puzzles solved</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {solved} of {attempted} attempted{accuracy != null ? ` · ${accuracy}% accuracy` : ''}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatClock(timeElapsedRef.current)} elapsed{timeLimit > 0 ? ` / ${formatClock(timeLimit)} limit` : ''}
          </p>
          <p className="text-xs font-semibold">
            {isNewBest ? '✓ New best!' : personalBest != null ? `Best: ${personalBest}` : ''}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={tryAgain}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </button>
            <button
              onClick={onSolved}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-foreground text-background text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── running ───────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-[55fr_45fr] lg:grid-cols-[65fr_35fr] gap-4" style={{ height: 'calc(100vh - 50px)' }}>
      <div className="flex flex-col min-w-0">
        <div className="flex justify-center overflow-hidden">
          <div className="w-full aspect-square mx-auto" style={{ maxWidth: 'min(100%, calc(100dvh - 14rem))' }}>
            <div style={{ boxShadow: boardBoxShadow, borderRadius: '4px', transition: 'box-shadow 150ms' }} onContextMenu={(e) => e.preventDefault()}>
              <Chessboard
                position={displayPosition}
                onPieceDrop={handleMove}
                boardOrientation={boardOrientation}
                customBoardStyle={{ borderRadius: '4px' }}
                customSquareStyles={customSquareStyles}
                isDraggablePiece={({ piece }) => !boardMoving && piece[0] === playerColor}
                areArrowsAllowed={false}
                animationDuration={200}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 min-w-0">
        <div className={cn(
          'text-4xl font-black tabular-nums leading-none',
          isTimeUp ? 'text-red-500 animate-pulse'
          : isCriticalTime ? 'text-red-500'
          : isLowTime ? 'text-amber-500'
          : 'text-foreground'
        )}>
          {formatClock(timeDisplay)}
        </div>

        <p className="text-sm text-muted-foreground tabular-nums">
          ⚡ {solved} solved &nbsp; ↷ {skipped} skipped &nbsp; [{puzzleIndex + 1} / {total}]
        </p>

        {currentPuzzle?.themes && currentPuzzle.themes.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">{currentPuzzle.themes.join(', ')}</p>
        )}

        <hr className="border-border" />

        <button
          onClick={handleSkip}
          className="w-full px-4 py-2 rounded-sm border border-border text-sm font-medium hover:bg-accent transition-colors"
        >
          Skip →
        </button>
      </div>
    </div>
  )
}
