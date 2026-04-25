'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentLessonProgress, CoachFeedbackRow } from '@/repositories/lesson/studentRepository'
import StudentProgressTable from '@/components/academy/StudentProgressTable'
import { grantManualPoints, setStudentTier, type StudentTier } from '@/actions/academy/coachActions'

interface GamificationSummary {
  totalPoints:      number
  level:            number
  levelName:        string
  currentStreak:    number
  longestStreak:    number
  lessonsCompleted: number
  achievements:     { key: string; name: string; icon: string; earnedAt: string }[]
}

interface StudentDetailClientProps {
  studentId: string
  studentName: string
  lessons: StudentLessonProgress[]
  feedback: CoachFeedbackRow[]
  isAdmin: boolean
  coaches: { id: string; full_name: string | null }[]
  gamification: GamificationSummary | null
  tier: string | null
}

const LEVEL_PIECES: Record<number, string> = { 1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }
const TIER_OPTIONS: { value: StudentTier; label: string }[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return null
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={cn('text-xs', i <= rating ? 'text-amber-500' : 'text-muted-foreground/30')}>★</span>
      ))}
    </div>
  )
}

// ── Award Points modal ──────────────────────────────────────────────────────────

function AwardPointsModal({
  studentId,
  onClose,
}: {
  studentId: string
  onClose: () => void
}) {
  const [points, setPoints] = useState('')
  const [note,   setNote]   = useState('')
  const [toast,  setToast]  = useState<{ ok: boolean; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(points, 10)
    if (!pts || pts <= 0 || !note.trim()) return
    startTransition(async () => {
      try {
        await grantManualPoints(studentId, pts, note)
        showToast(true, `+${pts} pts awarded`)
        setPoints('')
        setNote('')
        setTimeout(onClose, 1200)
      } catch (err) {
        showToast(false, err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold tracking-tight text-foreground">Award Points</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>

        {toast && (
          <div className={cn(
            'mb-4 px-3 py-2 rounded text-xs font-medium',
            toast.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                     : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          )}>
            {toast.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Points
            </label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="e.g. 25"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Note (required)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Excellent tournament performance"
              className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
              required
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-9 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Awarding…' : 'Award'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StudentDetailClient({
  studentId,
  lessons,
  feedback,
  gamification,
  tier: initialTier,
}: StudentDetailClientProps) {
  const completedCount  = lessons.filter(l => l.status === 'completed').length
  const inProgressCount = lessons.filter(l => l.status === 'in_progress').length
  const totalPoints     = lessons.reduce((sum, l) => sum + l.points, 0)

  const [showAwardModal, setShowAwardModal] = useState(false)
  const [currentTier, setCurrentTier]       = useState<string>(initialTier ?? '')
  const [tierToast, setTierToast]           = useState<{ ok: boolean; msg: string } | null>(null)
  const [isTierPending, startTierTransition] = useTransition()

  function showTierToast(ok: boolean, msg: string) {
    setTierToast({ ok, msg })
    setTimeout(() => setTierToast(null), 3000)
  }

  function handleTierChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newTier = e.target.value as StudentTier
    setCurrentTier(newTier)
    startTierTransition(async () => {
      try {
        await setStudentTier(studentId, newTier)
        showTierToast(true, `Tier set to ${newTier}`)
      } catch (err) {
        showTierToast(false, err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      {showAwardModal && (
        <AwardPointsModal studentId={studentId} onClose={() => setShowAwardModal(false)} />
      )}

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/academy/students" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to Students
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              Student Progress
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lesson progress and feedback history
            </p>
          </div>
          <button
            onClick={() => setShowAwardModal(true)}
            className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors flex-shrink-0"
          >
            Award Points
          </button>
        </div>
      </div>

      {/* Gamification + tier row */}
      {gamification && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border">
            <span className="text-base leading-none">{LEVEL_PIECES[gamification.level] ?? '♙'}</span>
            <span className="text-xs font-semibold text-foreground tracking-tight">{gamification.levelName}</span>
            <span className="text-[10px] text-muted-foreground ml-0.5">Lv.{gamification.level}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-amber-500">🔥</span>
            <span className="font-semibold text-foreground">{gamification.currentStreak}</span>
            <span>day streak</span>
          </div>
          {gamification.longestStreak > 0 && (
            <div className="text-xs text-muted-foreground">
              Best: <span className="font-medium text-foreground">{gamification.longestStreak}d</span>
            </div>
          )}

          {/* Tier selector */}
          <div className="ml-auto flex items-center gap-2">
            {tierToast && (
              <span className={cn(
                'text-xs font-medium',
                tierToast.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {tierToast.msg}
              </span>
            )}
            <select
              value={currentTier}
              onChange={handleTierChange}
              disabled={isTierPending}
              className="h-8 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-foreground/20 disabled:opacity-50"
            >
              <option value="">Set tier…</option>
              {TIER_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Achievements */}
      {gamification && gamification.achievements.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {gamification.achievements.map(a => (
            <div
              key={a.key}
              title={formatDate(a.earnedAt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground"
            >
              <span className="text-sm leading-none">{a.icon}</span>
              {a.name}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Lessons</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{lessons.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{completedCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">In Progress</p>
          <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{inProgressCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Points</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{gamification?.totalPoints ?? totalPoints}</p>
        </div>
      </div>

      {/* Lessons table */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Lessons</h2>
          <Link
            href={`/academy/reports?student=${studentId}#feedback`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Write feedback <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <StudentProgressTable rows={lessons} showPoints />
      </div>

      {/* Feedback history */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-3">Feedback History</h2>
        {feedback.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
            <Link
              href={`/academy/reports?student=${studentId}#feedback`}
              className="inline-flex items-center gap-1 text-xs text-foreground hover:underline mt-2"
            >
              Write feedback →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {feedback.map(item => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    {item.lesson_title && (
                      <p className="text-xs font-medium text-foreground mb-1">{item.lesson_title}</p>
                    )}
                    <p className="text-sm text-foreground/80">{item.feedback_text}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StarRating rating={item.rating} />
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
