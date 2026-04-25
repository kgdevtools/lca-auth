'use client'

import { useState } from 'react'
import { useExport } from '@/hooks/useExport'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentWithProgress } from '@/repositories/lesson/studentRepository'

interface LessonProgressRow {
  student_id: string
  student_name: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  quiz_score: number | null
  time_spent_seconds: number
  attempts: number
  started_at: string | null
  completed_at: string | null
  last_accessed_at: string | null
  points: number
}

interface LessonOption {
  id: string
  title: string
  difficulty: string | null
  content_type: string
}

interface LessonCentricReportProps {
  lessons: LessonOption[]
  // Pre-fetched data keyed by lesson_id
  progressByLesson: Record<string, LessonProgressRow[]>
}

const STATUS_META = {
  completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  not_started: { label: 'Not started', className: 'bg-muted text-muted-foreground' },
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

export default function LessonCentricReport({
  lessons,
  progressByLesson,
}: LessonCentricReportProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessons[0]?.id ?? '')
  const { isExporting, handleExport } = useExport<Record<string, any>>()

  const selectedLesson = lessons.find(l => l.id === selectedLessonId)
  const rows           = progressByLesson[selectedLessonId] ?? []

  const completedCount = rows.filter(r => r.status === 'completed').length
  const avgScore       = (() => {
    const scored = rows.filter(r => r.quiz_score != null)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((s, r) => s + (r.quiz_score ?? 0), 0) / scored.length)
  })()
  const totalPoints    = rows.reduce((s, r) => s + r.points, 0)

  const handleExportClick = () => {
    if (!rows.length) return
    const exportRows = rows.map(r => ({
      Student:          r.student_name,
      Status:           r.status,
      'Progress %':     r.progress_percentage,
      'Quiz score':     r.quiz_score ?? '',
      'Time spent':     r.time_spent_seconds > 0 ? formatTime(r.time_spent_seconds) : '',
      Attempts:         r.attempts,
      'Started at':     formatDate(r.started_at),
      'Completed at':   formatDate(r.completed_at),
      Points:           r.points,
    }))
    handleExport(
      exportRows,
      `lesson-report-${selectedLesson?.title ?? 'export'}`,
      { format: 'csv', scope: 'current' }
    )
  }

  return (
    <div className="space-y-4">

      {/* Lesson picker + export */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedLessonId}
            onChange={e => setSelectedLessonId(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none"
          >
            {lessons.length === 0 && (
              <option value="">No lessons available</option>
            )}
            {lessons.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExportClick}
          disabled={isExporting || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {isExporting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />
          }
          Export CSV
        </button>
      </div>

      {/* Lesson meta */}
      {selectedLesson && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground capitalize">
            {selectedLesson.content_type}
          </span>
          {selectedLesson.difficulty && (
            <span className="text-xs text-muted-foreground capitalize">
              · {selectedLesson.difficulty}
            </span>
          )}
        </div>
      )}

      {/* Summary stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[
            { label: 'Students',   value: rows.length },
            { label: 'Completed',  value: completedCount },
            { label: 'Avg score',  value: avgScore != null ? `${avgScore}%` : '—' },
            { label: 'Total pts',  value: totalPoints },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold tracking-tight text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {lessons.length === 0
              ? 'No lessons available.'
              : 'No students assigned to this lesson yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  {/* sm+ */}
                  <th className="hidden sm:table-cell px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Progress</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                  {/* md+ */}
                  <th className="hidden md:table-cell px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
                  <th className="hidden md:table-cell px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Attempts</th>
                  <th className="hidden md:table-cell px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Completed</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map(row => {
                  const meta = STATUS_META[row.status]
                  return (
                    <tr key={row.student_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium leading-snug">
                          {row.student_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                          meta.className
                        )}>
                          {meta.label}
                        </span>
                      </td>
                      {/* sm+ */}
                      <td className="hidden sm:table-cell px-4 py-3 text-right tabular-nums text-xs text-muted-foreground">
                        {row.progress_percentage}%
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right tabular-nums">
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
                      {/* md+ */}
                      <td className="hidden md:table-cell px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                        {row.time_spent_seconds > 0 ? formatTime(row.time_spent_seconds) : '—'}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                        {row.attempts}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(row.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.points > 0 ? (
                          <span className="text-sm font-semibold">{row.points}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
      )}
    </div>
  )
}