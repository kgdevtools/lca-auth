'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function formatBlockClock(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/**
 * Ticks a countdown down from `totalSeconds` while `enabled`, firing `onExpire`
 * exactly once when it reaches 0. Callers remount this per-block (the viewer
 * shell already keys its block subtree by block index), so no separate reset
 * is needed when the student moves to a new block.
 */
export function useBlockCountdown(totalSeconds: number, enabled: boolean, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!expiredRef.current) {
            expiredRef.current = true
            onExpireRef.current()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return secondsLeft
}

/**
 * Lichess-style digital clock for the whole-puzzle-SET countdown (one clock
 * for the entire batch, not per-puzzle) — dark block, bold monospace digits,
 * reddens in the last 20% of the total, flashes destructive at 0.
 */
export function PuzzleSetClock({
  secondsLeft, secondsTotal, className, size = 'chip',
}: { secondsLeft: number; secondsTotal: number; className?: string; size?: 'chip' | 'large' }) {
  const fraction = secondsTotal > 0 ? secondsLeft / secondsTotal : 1
  const isTimeUp = secondsLeft <= 0
  const isLowTime = !isTimeUp && fraction <= 0.2
  const bg = isTimeUp ? 'bg-destructive/10 border-destructive/30' : 'bg-slate-900 dark:bg-slate-950 border-slate-700'
  const digitColor = isTimeUp ? 'text-destructive' : isLowTime ? 'text-orange-400 animate-pulse' : 'text-white'

  // 'large' fills whatever flex space it's given (the puzzle viewer's right
  // panel uses this so the clock itself — not an empty gap — is what pushes
  // the board-controls bar down to sit flush with the board's bottom edge).
  if (size === 'large') {
    return (
      <div
        className={cn('flex-1 min-h-0 flex flex-col items-center justify-center gap-1 rounded-sm border select-none', bg, className)}
        title="Puzzle set timer — one clock for the whole set"
      >
        <span className={cn('text-[10px] uppercase tracking-wider font-semibold', isTimeUp ? 'text-destructive' : 'text-slate-400')}>
          Set timer
        </span>
        <span className={cn('font-mono font-bold tabular-nums leading-none text-4xl sm:text-5xl', digitColor)}>
          {formatBlockClock(secondsLeft)}
        </span>
      </div>
    )
  }

  // No label here (just the digits) — this chip sits right next to the
  // Session data chip on mobile, where every bit of width matters; `inline-flex`
  // + no flex-grow so it hugs its own content instead of stretching to fill
  // half the row like the Session chip next to it does.
  return (
    <div
      className={cn('inline-flex items-center justify-center h-8 px-3 rounded-sm border select-none', bg, className)}
      title="Puzzle set timer — one clock for the whole set"
    >
      <span className={cn('font-mono text-sm font-bold tabular-nums leading-none', digitColor)}>
        {formatBlockClock(secondsLeft)}
      </span>
    </div>
  )
}

/** Visual language matches the Daily Puzzles Rush-mode header timer. */
export function BlockTimerChip({ secondsLeft, className }: { secondsLeft: number; className?: string }) {
  const isLowTime = secondsLeft <= 30 && secondsLeft > 0
  const isTimeUp = secondsLeft <= 0
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-bold tabular-nums select-none',
        isTimeUp
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : isLowTime
          ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-600 dark:text-orange-400'
          : 'bg-slate-100 dark:bg-slate-800 border-border text-muted-foreground',
        className,
      )}
      title={isTimeUp ? "Time's up" : 'Time remaining'}
    >
      <Clock className="w-3.5 h-3.5" />
      {formatBlockClock(secondsLeft)}
    </div>
  )
}
