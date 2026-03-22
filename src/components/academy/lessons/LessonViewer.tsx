'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'
import type { Move } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type UiMove = Move & { moveNumber: number; annotation?: string }

interface LessonViewerProps {
  pgn: string
  title: string
  description?: string | null
  initialMoveIndex?: number
  onComplete?: () => void
}

export default function LessonViewer({
  pgn,
  title,
  description,
  initialMoveIndex = -1,
  onComplete,
}: LessonViewerProps) {
  const [gameHistory, setGameHistory] = useState<{ moves: UiMove[]; fenHistory: string[] }>({
    moves: [],
    fenHistory: [],
  })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialMoveIndex)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({})
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined)

  const [isReplaying, setIsReplaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const replayMoveIndexRef = useRef<number>(0)

  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>(0)

  // Parse PGN with annotations
  useEffect(() => {
    if (!pgn) {
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
      setCurrentMoveIndex(-1)
      return
    }

    try {
      // Clean up PGN - handle annotations in braces
      const displayPgn = pgn.replace(/\{([^}]*)\}/g, (_match, content) => {
        return ` {${content}} `
      })

      const chess = new Chess()
      chess.loadPgn(displayPgn)
      setGameHeaders(chess.header() as Record<string, string>)

      // Parse moves and extract annotations from PGN
      const history = chess.history({ verbose: true }) as Move[]
      const temp = new Chess()
      const fenHistory: string[] = [temp.fen()]

      // Extract annotations from PGN - they come after each move in braces
      const annotationRegex = /\{([^}]*)\}/g
      const pgnMatches = pgn.matchAll(annotationRegex)
      const annotations: string[] = []
      for (const match of pgnMatches) {
        annotations.push(match[1].trim())
      }

      const movesWithAnnotations: UiMove[] = history.map((m, i) => ({
        ...(m as any),
        moveNumber: Math.floor(i / 2) + 1,
        annotation: annotations[i] || undefined,
      }))

      history.forEach((m) => {
        try {
          temp.move((m as any).san)
          fenHistory.push(temp.fen())
        } catch {
          // ignore
        }
      })

      setGameHistory({
        moves: movesWithAnnotations,
        fenHistory,
      })
      setCurrentMoveIndex(-1)
    } catch (e) {
      console.error('Failed to parse PGN:', e)
      setGameHeaders({})
      setGameHistory({ moves: [], fenHistory: [new Chess().fen()] })
      setCurrentMoveIndex(-1)
    }
  }, [pgn])

  // Measure board
  useEffect(() => {
    function measure() {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Update last move highlight
  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const m = gameHistory.moves[currentMoveIndex]
      setLastMove({ from: m.from, to: m.to })
    } else {
      setLastMove(undefined)
    }
  }, [currentMoveIndex, gameHistory.moves])

  // Navigation functions
  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current)
      replayTimerRef.current = null
    }
    setIsReplaying(false)
    setIsPaused(false)
    replayMoveIndexRef.current = -1
  }, [])

  const navigateTo = useCallback(
    (index: number) => {
      if (isReplaying) stopReplay()
      setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1)))
    },
    [gameHistory.moves.length, isReplaying, stopReplay],
  )

  const startReplay = useCallback(() => {
    if (gameHistory.moves.length === 0) return
    stopReplay()
    setCurrentMoveIndex(-1)
    setIsReplaying(true)
    setIsPaused(false)
    replayMoveIndexRef.current = -1
    replayTimerRef.current = setInterval(() => {
      replayMoveIndexRef.current++
      if (replayMoveIndexRef.current >= gameHistory.moves.length) {
        stopReplay()
        return
      }
      setCurrentMoveIndex(replayMoveIndexRef.current)
    }, 1500)
  }, [gameHistory.moves.length, stopReplay])

  const toggleReplay = useCallback(() => {
    if (!isReplaying) startReplay()
    else if (isPaused) {
      setIsPaused(false)
      replayTimerRef.current = setInterval(() => {
        replayMoveIndexRef.current++
        if (replayMoveIndexRef.current >= gameHistory.moves.length) {
          stopReplay()
          return
        }
        setCurrentMoveIndex(replayMoveIndexRef.current)
      }, 1500)
    } else {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current)
        replayTimerRef.current = null
      }
      setIsPaused(true)
    }
  }, [isReplaying, isPaused, gameHistory.moves.length, startReplay, stopReplay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current)
    }
  }, [])

  // Stop replay on PGN change
  useEffect(() => {
    stopReplay()
  }, [pgn, stopReplay])

  const currentFen = gameHistory.fenHistory[currentMoveIndex + 1] ?? null

  const squareStyles = lastMove
    ? {
        [lastMove.from]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
        [lastMove.to]: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
      }
    : {}

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: Board */}
      <div className="flex-1 min-w-0">
        <div className="space-y-2">
          {/* Board */}
          <div className="aspect-square max-w-[400px] mx-auto lg:mx-0">
            <div
              ref={boardWrapperRef}
              className="w-full aspect-square rounded-sm overflow-hidden border border-border shadow-md"
            >
              {boardWidth > 0 ? (
                <Chessboard
                  boardWidth={boardWidth}
                  position={currentFen || 'start'}
                  arePiecesDraggable={false}
                  customSquareStyles={squareStyles}
                />
              ) : (
                <div className="w-full h-full bg-muted animate-pulse" />
              )}
            </div>
          </div>

          {/* Controls */}
          <LessonControls
            onStart={() => navigateTo(-1)}
            onPrev={() => navigateTo(currentMoveIndex - 1)}
            onNext={() => navigateTo(currentMoveIndex + 1)}
            onEnd={() => navigateTo(gameHistory.moves.length - 1)}
            onReplay={toggleReplay}
            canGoBack={currentMoveIndex > -1}
            canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
            isReplaying={isReplaying}
            isPaused={isPaused}
          />
        </div>
      </div>

      {/* Right: Moves & Annotations */}
      <div className="flex-1 min-w-0 lg:max-w-md">
        <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Moves</h3>
          </div>
          <MovesListWithAnnotations
            moves={gameHistory.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveSelect={navigateTo}
          />
        </div>
      </div>
    </div>
  )
}

// Controls component
function LessonControls({
  onStart,
  onPrev,
  onNext,
  onEnd,
  onReplay,
  canGoBack,
  canGoForward,
  isReplaying,
  isPaused,
}: {
  onStart: () => void
  onPrev: () => void
  onNext: () => void
  onEnd: () => void
  onReplay: () => void
  canGoBack: boolean
  canGoForward: boolean
  isReplaying: boolean
  isPaused: boolean
}) {
  const showPause = isReplaying && !isPaused
  const btnClass = 'flex-1 rounded-sm bg-transparent h-9'

  return (
    <div className="flex justify-center items-center gap-1 p-1.5 bg-card border border-border rounded-sm shadow-sm max-w-[400px] mx-auto">
      <Button variant="outline" size="sm" onClick={onStart} disabled={!canGoBack || (isReplaying && !isPaused)} aria-label="Start" className={btnClass}>
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onPrev} disabled={!canGoBack || (isReplaying && !isPaused)} aria-label="Prev" className={btnClass}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button variant={showPause ? 'default' : 'outline'} size="sm" onClick={onReplay} aria-label={showPause ? 'Pause' : 'Play'} className={btnClass}>
        {showPause ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!canGoForward || (isReplaying && !isPaused)} aria-label="Next" className={btnClass}>
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onEnd} disabled={!canGoForward || (isReplaying && !isPaused)} aria-label="End" className={btnClass}>
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

// Moves list with annotations
function MovesListWithAnnotations({
  moves,
  currentMoveIndex,
  onMoveSelect,
}: {
  moves: UiMove[]
  currentMoveIndex: number
  onMoveSelect: (index: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentMoveIndex])

  // Group moves into pairs
  const movePairs: Array<[UiMove, UiMove | null]> = []
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push([moves[i], moves[i + 1] ?? null])
  }

  if (moves.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No moves in this lesson.
      </div>
    )
  }

  return (
    <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: '300px' }}>
      <div className="p-3 space-y-2">
        {movePairs.map(([white, black], pairIndex) => {
          const whiteIndex = pairIndex * 2
          const blackIndex = pairIndex * 2 + 1

          return (
            <div key={pairIndex} className="flex items-start gap-2">
              {/* Move number */}
              <span className="text-xs text-muted-foreground font-mono w-6 flex-shrink-0 pt-0.5">
                {white.moveNumber}.
              </span>

              {/* White move */}
              <div className="flex-1 min-w-0">
                <button
                  ref={whiteIndex === currentMoveIndex ? activeRef : undefined}
                  onClick={() => onMoveSelect(whiteIndex)}
                  className={cn(
                    'w-full text-left text-sm px-2 py-1 rounded transition-colors',
                    whiteIndex === currentMoveIndex
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-accent/60 text-foreground',
                  )}
                >
                  <span>{white.san}</span>
                  {white.annotation && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5 italic">
                      {white.annotation}
                    </span>
                  )}
                </button>
              </div>

              {/* Black move */}
              {black && (
                <div className="flex-1 min-w-0">
                  <button
                    ref={blackIndex === currentMoveIndex ? activeRef : undefined}
                    onClick={() => onMoveSelect(blackIndex)}
                    className={cn(
                      'w-full text-left text-sm px-2 py-1 rounded transition-colors',
                      blackIndex === currentMoveIndex
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-accent/60 text-foreground',
                    )}
                  >
                    <span>{black.san}</span>
                    {black.annotation && (
                      <span className="block text-[10px] text-muted-foreground mt-0.5 italic">
                        {black.annotation}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}