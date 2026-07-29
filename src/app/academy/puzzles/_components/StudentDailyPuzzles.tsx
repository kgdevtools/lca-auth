'use client'

import { useState, useRef, useEffect, useCallback, useMemo, useTransition } from 'react'
import { Lightbulb, RotateCcw, Eye, ChevronRight, FlipVertical, CheckCircle2, XCircle, TrendingUp, TrendingDown, Trophy, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { recordPuzzleAttempt, type PuzzleSolveResult } from '@/actions/academy/dailyPuzzleActions'
import type { StoredPuzzle } from '@/services/dailyPuzzleService'
import DailyPuzzleBoard from './DailyPuzzleBoard'

type Status = 'solving' | 'correct' | 'wrong' | 'revealed'

interface Props {
  puzzles:  StoredPuzzle[]
  attempts: Record<string, boolean>
  rating:   number
  hasCoach: boolean
}

// Puzzle-Rush style: solve as many as you can before time runs out.
const RUSH_DURATION = 180

// Desktop board-sizing: fit to available height, reserve panel width, cap 560.
function useStage(ref: React.RefObject<HTMLDivElement | null>) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mq.matches)
    apply(); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  const boardSize = isDesktop ? Math.max(220, Math.min(box.h - 8, box.w - 288, 560)) : 0
  return { isDesktop, boardSize }
}

export default function StudentDailyPuzzles({ puzzles, attempts, rating, hasCoach }: Props) {
  // Start at the first un-attempted puzzle.
  const firstUnsolved = useMemo(() => {
    const i = puzzles.findIndex(p => attempts[p.lichessId] === undefined)
    return i === -1 ? 0 : i
  }, [puzzles, attempts])

  const [index, setIndex]       = useState(firstUnsolved)
  const [status, setStatus]     = useState<Status>('solving')
  const [sans, setSans]         = useState<string[]>([])
  const [resetSignal, setReset] = useState(0)
  const [reveal, setReveal]     = useState(false)
  const [flipped, setFlipped]   = useState(false)
  const [hint, setHint]         = useState(false)
  const [result, setResult]     = useState<PuzzleSolveResult | null>(null)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [liveRating, setLiveRating]       = useState(rating)
  const [, startRecord]         = useTransition()

  // ── Rush timer ────────────────────────────────────────────────────────────
  // Only gate fresh solving with a countdown; a student re-opening a fully
  // completed set is just reviewing and shouldn't be forced through it again.
  const alreadyFullyAttempted = useMemo(
    () => puzzles.length > 0 && puzzles.every(p => attempts[p.lichessId] !== undefined),
    [puzzles, attempts]
  )
  const [rushStarted, setRushStarted] = useState(false)
  const [rushActive, setRushActive]   = useState(false)
  const [timeLeft, setTimeLeft]       = useState(RUSH_DURATION)
  const [rushSolved, setRushSolved]   = useState(0)
  const [rushFailed, setRushFailed]   = useState(0)

  useEffect(() => {
    if (!rushActive) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setRushActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [rushActive])

  const startRush = useCallback(() => {
    setRushStarted(true)
    setRushActive(true)
  }, [])

  const restartRush = useCallback(() => {
    setTimeLeft(RUSH_DURATION)
    setRushSolved(0)
    setRushFailed(0)
    setRushActive(true)
  }, [])

  const recordedRef = useRef<Set<string>>(new Set())
  const stageRef = useRef<HTMLDivElement>(null)
  const { isDesktop, boardSize } = useStage(stageRef)

  const puzzle = puzzles[index]
  const total  = puzzles.length
  const solvedCount = Object.values(attempts).filter(Boolean).length

  // Stop the clock once every puzzle in today's set has been attempted —
  // finishing early shouldn't force the student to sit out the rest of the clock.
  useEffect(() => {
    if (rushActive && rushSolved + rushFailed >= total) setRushActive(false)
  }, [rushActive, rushSolved, rushFailed, total])

  const send = useCallback((p: StoredPuzzle, solved: boolean) => {
    if (recordedRef.current.has(p.lichessId)) return
    recordedRef.current.add(p.lichessId)
    if (solved) setRushSolved(s => s + 1); else setRushFailed(s => s + 1)
    startRecord(async () => {
      try {
        const r = await recordPuzzleAttempt({ puzzleId: p.lichessId, puzzleRating: p.rating, solved })
        setResult(r)
        if (r.applied) {
          setSessionPoints(s => s + r.pointsEarned)
          setLiveRating(r.ratingAfter)
        }
      } catch { /* non-fatal */ }
    })
  }, [])

  const handleSolved = useCallback((_clean: boolean) => {
    if (puzzle) send(puzzle, true)
  }, [puzzle, send])

  const goNext = useCallback(() => {
    // Reaching here without solving counts as a fail (reveal / skip).
    if (puzzle && status !== 'correct') send(puzzle, false)
    setStatus('solving'); setSans([]); setReveal(false); setHint(false); setResult(null)
    setIndex(i => Math.min(i + 1, total - 1))
    setReset(s => s + 1)
  }, [puzzle, status, send, total])

  const handleRetry = useCallback(() => {
    setStatus('solving'); setSans([]); setReveal(false); setResult(null)
    setReset(s => s + 1)
  }, [])

  const handleReveal = useCallback(() => {
    setReveal(true); setStatus('revealed')
    if (puzzle) send(puzzle, false)
  }, [puzzle, send])

  // ── Empty states ────────────────────────────────────────────────────────────
  if (!hasCoach) {
    return <Centered title="No coach assigned" body="Once a coach adds you, their daily puzzles will appear here." />
  }
  if (total === 0) {
    return <Centered title="No puzzles today" body="Your coach hasn't published a puzzle set yet. Check back soon." />
  }

  // ── Rush gate: only for a fresh (not fully-attempted) set ───────────────────
  if (!alreadyFullyAttempted && !rushStarted) {
    return <RushStartGate total={total} onStart={startRush} />
  }
  const rushTimeUp = rushStarted && !alreadyFullyAttempted && timeLeft <= 0
  if (rushTimeUp) {
    return <RushEndScreen solved={rushSolved} failed={rushFailed} onRestart={restartRush} />
  }

  const allDone = solvedCount >= total && status !== 'correct' && index >= total - 1 && recordedRef.current.size > 0
  const onLastSolvedView = index >= total - 1 && status === 'correct'
  const showTimer = rushStarted && !alreadyFullyAttempted

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] overflow-hidden">
      {/* Header strip */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">Daily Puzzles</h1>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.min(index + 1, total)} / {total}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {showTimer && <RushTimer timeLeft={timeLeft} solved={rushSolved} failed={rushFailed} />}
          <Stat label="Rating" value={liveRating} />
          <Stat label="Session pts" value={`+${sessionPoints}`} accent />
        </div>
      </div>

      {/* Stage */}
      <div ref={stageRef} className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden lg:gap-3 lg:p-3">
        {/* Board */}
        <div
          className="flex-1 min-h-0 min-w-0 lg:flex-none flex items-center justify-center"
          style={isDesktop && boardSize > 0 ? { width: boardSize, height: boardSize } : undefined}
        >
          {puzzle && (
            <DailyPuzzleBoard
              puzzle={puzzle}
              status={status}
              onStatusChange={setStatus}
              onSolved={handleSolved}
              onMovesChange={setSans}
              flipped={flipped}
              size={isDesktop ? boardSize : undefined}
              resetSignal={resetSignal}
              reveal={reveal}
            />
          )}
        </div>

        {/* Panel */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden bg-card border-t border-border lg:border lg:rounded-md lg:flex-1 lg:min-w-[260px]"
          style={isDesktop && boardSize > 0 ? { height: boardSize } : undefined}
        >
          {/* Puzzle meta */}
          <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Puzzle <span className="ml-1 font-mono normal-case tracking-normal">★ {puzzle?.rating ?? '—'}</span>
            </p>
            <button onClick={() => setFlipped(f => !f)} title="Flip board"
              className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback banner */}
          {status === 'correct' && (
            <Banner tone="ok"><CheckCircle2 className="w-4 h-4" /> Solved!{result?.applied && result.pointsEarned > 0 ? ` +${result.pointsEarned} pts` : ''}</Banner>
          )}
          {status === 'wrong' && <Banner tone="err"><XCircle className="w-4 h-4" /> Not quite — try again.</Banner>}
          {status === 'revealed' && <Banner tone="muted"><Eye className="w-4 h-4" /> Solution shown.</Banner>}

          {/* Rating delta after recording */}
          {result?.applied && (
            <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center gap-2 text-xs">
              {result.ratingAfter >= result.ratingBefore ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className="text-muted-foreground">Rating</span>
              <span className="font-semibold tabular-nums">{result.ratingBefore} → {result.ratingAfter}</span>
              <span className={cn('tabular-nums font-medium', result.ratingAfter >= result.ratingBefore ? 'text-emerald-600' : 'text-red-600')}>
                ({result.ratingAfter >= result.ratingBefore ? '+' : ''}{result.ratingAfter - result.ratingBefore})
              </span>
            </div>
          )}

          {/* Hint */}
          {hint && puzzle?.themes?.length ? (
            <div className="flex-shrink-0 mx-3 my-2 px-2.5 py-1.5 rounded-sm bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Theme: {puzzle.themes.slice(0, 2).join(', ')}
            </div>
          ) : null}

          {/* Moves list */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Moves</p>
            {sans.length === 0 ? (
              <p className="text-xs text-muted-foreground">Your move. Find the best continuation.</p>
            ) : (
              <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 font-mono text-sm">
                {sans.map((san, i) => (
                  <span key={i}>
                    {i % 2 === 0 && <span className="text-muted-foreground mr-0.5">{Math.floor(i / 2) + 1}.</span>}
                    <span className={cn(i === sans.length - 1 && 'bg-amber-500/20 rounded-[2px] px-0.5')}>{san}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Completion */}
          {(allDone || onLastSolvedView) && (
            <div className="flex-shrink-0 mx-3 mb-2 px-3 py-2.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                That&apos;s today&apos;s set done — +{sessionPoints} pts earned. Nice work!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex-shrink-0 border-t border-border p-2 grid grid-cols-3 gap-1.5">
            <Button variant="outline" size="sm" className="h-9" disabled={status === 'correct' || status === 'revealed'}
              onClick={() => setHint(true)}>
              <Lightbulb className="w-3.5 h-3.5 mr-1" /> Hint
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleRetry}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
            {status === 'correct' || status === 'revealed' ? (
              <Button size="sm" className="h-9" onClick={goNext} disabled={index >= total - 1}>
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-9" onClick={handleReveal}>
                <Eye className="w-3.5 h-3.5 mr-1" /> Solution
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small presentational helpers ────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end leading-none gap-0.5">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold tabular-nums', accent && 'text-amber-600 dark:text-amber-400')}>{value}</span>
    </div>
  )
}

function Banner({ tone, children }: { tone: 'ok' | 'err' | 'muted'; children: React.ReactNode }) {
  const cls = tone === 'ok'
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
    : tone === 'err'
    ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
    : 'bg-muted/50 text-muted-foreground'
  return (
    <div className={cn('flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-b border-border', cls)}>
      {children}
    </div>
  )
}

function Centered({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-5rem)] text-center px-6">
      <p className="text-base font-semibold tracking-tight">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{body}</p>
    </div>
  )
}

// ── Puzzle Rush: start gate, header timer, end screen ───────────────────────

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function RushStartGate({ total, onStart }: { total: number; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-5rem)] text-center px-6">
      <Zap className="w-8 h-8 text-amber-500 mb-3" />
      <h1 className="text-xl font-bold tracking-tight">Ready to start?</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        You have {formatClock(RUSH_DURATION)} to solve as many of today&apos;s {total} puzzle{total === 1 ? '' : 's'} as you can.
      </p>
      <Button onClick={onStart} size="lg" className="mt-5 gap-2">
        <Zap className="w-4 h-4" /> Start Rush
      </Button>
    </div>
  )
}

function RushTimer({ timeLeft, solved, failed }: { timeLeft: number; solved: number; failed: number }) {
  const isLowTime = timeLeft <= 30 && timeLeft > 0
  const isTimeUp = timeLeft <= 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Clock className={cn('w-3.5 h-3.5', isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-500' : 'text-muted-foreground')} />
        <span className={cn('text-sm font-bold tabular-nums', isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-500' : 'text-foreground')}>
          {formatClock(timeLeft)}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{solved}✓</span>
        <span className="text-red-600 dark:text-red-400 font-semibold">{failed}✗</span>
      </div>
    </div>
  )
}

function RushEndScreen({ solved, failed, onRestart }: { solved: number; failed: number; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-5rem)] text-center px-6">
      <h1 className="text-xl font-bold tracking-tight">Time&apos;s up!</h1>
      <div className="flex gap-8 mt-5">
        <div>
          <p className="text-3xl font-bold text-emerald-500 tabular-nums">{solved}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Solved</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-red-500 tabular-nums">{failed}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Missed</p>
        </div>
      </div>
      <Button onClick={onRestart} size="lg" className="mt-6 gap-2">
        <RotateCcw className="w-4 h-4" /> Go again
      </Button>
    </div>
  )
}
