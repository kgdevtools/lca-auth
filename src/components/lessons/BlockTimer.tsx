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
