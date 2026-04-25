'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LEVEL_NAMES, type LevelNumber } from '@/lib/constants/achievements'
import type { GamificationResult } from '@/services/gamificationService'

// ── Level display data ────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500] as const
const LEVEL_PIECES: Record<number, string> = {
  1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚',
}

// ── Count-up animation hook ───────────────────────────────────────────────────

function useCountUp(target: number, enabled: boolean, duration = 600) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!enabled) return
    if (target === 0) { setValue(0); return }
    const start = Date.now()
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(target * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, enabled, duration])
  return value
}

// ── Animation variants ────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0 },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface LessonCompleteScreenProps {
  lesson: { id: string; title: string }
  gamification: GamificationResult | null
  gamificationPending: boolean
  sessionSummary?: { breakdown: Array<{ label: string; pts: number }>; total: number }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LessonCompleteScreen({
  lesson,
  gamification: g,
  gamificationPending,
  sessionSummary,
}: LessonCompleteScreenProps) {
  const router = useRouter()

  const earnedDisplay = useCountUp(g?.pointsEarned ?? 0, !!g)
  const totalDisplay  = useCountUp(g?.newTotal     ?? 0, !!g)

  // Progress bar width — deferred so CSS transition fires after mount
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    if (!g) return
    const currentMin = LEVEL_THRESHOLDS[g.newLevel - 1] ?? 0
    const nextMin    = LEVEL_THRESHOLDS[g.newLevel]
    const pct = nextMin
      ? Math.round(((g.newTotal - currentMin) / (nextMin - currentMin)) * 100)
      : 100
    const t = setTimeout(() => setBarWidth(Math.min(pct, 100)), 150)
    return () => clearTimeout(t)
  }, [g])

  const levelName     = LEVEL_NAMES[(g?.newLevel ?? 1) as LevelNumber] ?? 'Pawn'
  const levelPiece    = LEVEL_PIECES[g?.newLevel ?? 1] ?? '♙'
  const nextLevelName = g ? LEVEL_NAMES[Math.min(g.newLevel + 1, 6) as LevelNumber] : null
  const nextThreshold = g ? LEVEL_THRESHOLDS[g.newLevel] : null

  // Build full breakdown: per-block items (client) + gamification bonuses (server)
  const fullBreakdown: Array<{ label: string; pts: number; muted: boolean }> = []

  if (sessionSummary?.breakdown.length) {
    sessionSummary.breakdown.forEach(item =>
      fullBreakdown.push({ ...item, muted: false })
    )
  }
  if (g && !gamificationPending) {
    if (g.breakdown.lesson > 0)
      fullBreakdown.push({ label: 'Completion bonus', pts: g.breakdown.lesson, muted: true })
    if (g.breakdown.quizBonus > 0)
      fullBreakdown.push({ label: 'Quiz bonus', pts: g.breakdown.quizBonus, muted: true })
    if (g.breakdown.firstAttemptBonus > 0)
      fullBreakdown.push({ label: 'First attempt mastery', pts: g.breakdown.firstAttemptBonus, muted: true })
  }

  const sessionTotal = g?.pointsEarned ?? sessionSummary?.total ?? null
  const hasBreakdown = fullBreakdown.length > 0 || (gamificationPending && (sessionSummary?.breakdown.length ?? 0) > 0)

  return (
    <div className="max-w-xl mx-auto px-5 py-7">
      <motion.div variants={stagger} initial="hidden" animate="show" transition={{ duration: 0.25 }} className="space-y-6">

        {/* Header */}
        <motion.div variants={fadeUp}>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 truncate">
            {lesson.title}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
            Lesson Complete
          </h1>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="border-t border-border" />
        </motion.div>

        {/* Stats cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Points earned</p>
            {gamificationPending ? (
              <div className="h-8 w-20 rounded bg-muted/50 animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {g ? `+${earnedDisplay}` : '—'}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total XP</p>
            {gamificationPending ? (
              <div className="h-8 w-20 rounded bg-muted/50 animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {g ? totalDisplay : '—'}
              </p>
            )}
          </div>
        </motion.div>

        {/* Breakdown */}
        {hasBreakdown && (
          <motion.div variants={fadeUp}>
            <h2 className="text-sm font-semibold tracking-tight text-foreground mb-3">Breakdown</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {/* Per-block rows — always visible immediately */}
                {sessionSummary?.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                    <span className="text-xs font-bold tabular-nums text-foreground">+{item.pts}</span>
                  </div>
                ))}

                {/* Gamification bonus rows — appear once server responds */}
                {g && !gamificationPending ? (
                  <>
                    {g.breakdown.lesson > 0 && (
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-muted-foreground">Completion bonus</span>
                        <span className="text-xs tabular-nums text-muted-foreground">+{g.breakdown.lesson}</span>
                      </div>
                    )}
                    {g.breakdown.quizBonus > 0 && (
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-muted-foreground">Quiz bonus</span>
                        <span className="text-xs tabular-nums text-muted-foreground">+{g.breakdown.quizBonus}</span>
                      </div>
                    )}
                    {g.breakdown.firstAttemptBonus > 0 && (
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-muted-foreground">First attempt mastery</span>
                        <span className="text-xs tabular-nums text-muted-foreground">+{g.breakdown.firstAttemptBonus}</span>
                      </div>
                    )}
                  </>
                ) : gamificationPending ? (
                  <div className="px-4 py-2.5 flex gap-3">
                    <div className="h-3 w-28 rounded bg-muted/50 animate-pulse" />
                    <div className="h-3 w-10 rounded bg-muted/50 animate-pulse ml-auto" />
                  </div>
                ) : null}

                {/* Total row */}
                {sessionTotal !== null && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                    <span className="text-xs font-semibold text-foreground">Session total</span>
                    <span className="text-xs font-bold tabular-nums text-foreground">{sessionTotal} pts</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Level + progress */}
        {g && (
          <motion.div variants={fadeUp} className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xl leading-none">{levelPiece}</span>
                <span className="text-sm font-semibold tracking-tight">{levelName}</span>
                {g.levelUp && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-400">
                    Level up
                  </span>
                )}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {totalDisplay} pts total
              </span>
            </div>
            {g.newLevel < 6 ? (
              <>
                <div className="h-[3px] rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {nextLevelName && nextThreshold && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {g.newTotal} / {nextThreshold} pts to {nextLevelName}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">Maximum level reached</p>
            )}
          </motion.div>
        )}

        {/* New achievements */}
        {g && g.newAchievements.length > 0 && (
          <motion.div variants={fadeUp}>
            <h2 className="text-sm font-semibold tracking-tight text-foreground mb-2">Unlocked</h2>
            <div className="flex flex-wrap gap-2">
              {g.newAchievements.map(a => (
                <span
                  key={a.key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground"
                >
                  {a.icon} {a.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => router.push('/academy/lesson')} className="flex-1">
            Back to Lessons
          </Button>
          <Button variant="outline" onClick={() => router.push('/academy')} className="flex-1">
            Academy Home
          </Button>
        </motion.div>

      </motion.div>
    </div>
  )
}
