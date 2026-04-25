
'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentLessonProgress } from '@/repositories/lesson/studentRepository'

interface StudentProgressTableProps {
  rows: StudentLessonProgress[]
  showPoints?: boolean
}

type SortKey = 'lesson_title' | 'status' | 'progress_percentage' | 'points' | 'last_accessed_at'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  StudentLessonProgress['status'],
  { label: string; className: string }
> = {
  completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'       },
  not_started: { label: 'Not started', className: 'bg-muted text-muted-foreground'                                             },
}

function formatTime(seconds: number): string {
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            value === 100 ? 'bg-emerald-500'
            : value > 0   ? 'bg-amber-400'
            :               'bg-muted-foreground/20'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right flex-shrink-0">
        {value}%
      </span>
    </div>
  )
}

// ── Sortable column header ────────────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = current === sortKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide',
        'text-muted-foreground hover:text-foreground transition-colors',
        align === 'right' && 'flex-row-reverse'
      )}
    >
      {label}
      {active
        ? dir === 'asc'
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        : <ChevronDown className="w-3 h-3 opacity-25" />
      }
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentProgressTable({
  rows,
  showPoints = true,
}: StudentProgressTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('last_accessed_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: any = a[sortKey]
    let bv: any = b[sortKey]
    if (sortKey === 'last_accessed_at') { av = av ?? ''; bv = bv ?? '' }
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">No lessons assigned yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-3 sm:px-4 py-2.5 text-left">
              <SortHeader label="Lesson" sortKey="lesson_title" current={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            <th className="px-3 sm:px-4 py-2.5 text-left">
              <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            {/* sm+ only */}
            <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-left w-[160px]">
              <SortHeader label="Progress" sortKey="progress_percentage" current={sortKey} dir={sortDir} onSort={handleSort} />
            </th>
            {/* md+ only */}
            <th className="hidden md:table-cell px-3 sm:px-4 py-2.5 text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Score</span>
            </th>
            <th className="hidden md:table-cell px-3 sm:px-4 py-2.5 text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time</span>
            </th>
            {/* always */}
            {showPoints && (
              <th className="px-3 sm:px-4 py-2.5 text-right">
                <SortHeader label="Pts" sortKey="points" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
              </th>
            )}
            {/* sm+ only */}
            <th className="hidden sm:table-cell px-3 sm:px-4 py-2.5 text-right">
              <SortHeader label="Last active" sortKey="last_accessed_at" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map(row => {
            const meta = STATUS_META[row.status]
            return (
              <tr key={row.lesson_id} className="hover:bg-muted/20 transition-colors">

                {/* Title + difficulty */}
                <td className="px-3 sm:px-4 py-3">
                  <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
                    {row.lesson_title}
                  </p>
                  {row.lesson_difficulty && (
                    <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                      {row.lesson_difficulty}
                    </p>
                  )}
                </td>

                {/* Status badge */}
                <td className="px-3 sm:px-4 py-3">
                  <span className={cn(
                    'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                    meta.className
                  )}>
                    {meta.label}
                  </span>
                </td>

                {/* Progress bar — sm+ */}
                <td className="hidden sm:table-cell px-3 sm:px-4 py-3">
                  <ProgressBar value={row.progress_percentage} />
                </td>

                {/* Quiz score — md+ */}
                <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-right tabular-nums">
                  {row.quiz_score != null ? (
                    <span className={cn(
                      'text-sm',
                      row.quiz_score >= 70
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    )}>
                      {row.quiz_score}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>

                {/* Time spent — md+ */}
                <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                  {row.time_spent_seconds > 0 ? formatTime(row.time_spent_seconds) : '—'}
                </td>

                {/* Points — always */}
                {showPoints && (
                  <td className="px-3 sm:px-4 py-3 text-right">
                    {row.points > 0 ? (
                      <span className="text-sm font-semibold text-foreground">{row.points}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}

                {/* Last active — sm+ */}
                <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(row.last_accessed_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}