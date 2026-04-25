'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StudentWithProgress } from '@/repositories/lesson/studentRepository'

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500]
const LEVEL_PIECES: Record<number, string> = { 1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

function getLevel(pts: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) level = i + 1
  }
  return level
}

interface StudentsClientProps {
  students: StudentWithProgress[]
  isAdmin: boolean
}

type SortKey = 'full_name' | 'lessons_assigned' | 'lessons_completed' | 'points' | 'last_active_at'
type SortDir = 'asc' | 'desc'

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function Initials({ name }: { name: string }) {
  if (!name) return <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center"><span className="text-[10px] font-semibold text-foreground/60">?</span></div>
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2)
  return (
    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-semibold text-foreground/60 uppercase">{letters}</span>
    </div>
  )
}

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
        ? dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        : <ChevronDown className="w-3 h-3 opacity-25" />
      }
    </button>
  )
}

export default function StudentsClient({ students, isAdmin }: StudentsClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>('last_active_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = students
    .filter(s => s.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
    .sort((a, b) => {
      let av: any = a[sortKey]
      let bv: any = b[sortKey]
      if (sortKey === 'last_active_at') { av = av ?? ''; bv = bv ?? '' }
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalStudents = students.length
  const totalLessons = students.reduce((sum, s) => sum + s.lessons_assigned, 0)
  const totalPoints = students.reduce((sum, s) => sum + s.points, 0)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Students</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{totalStudents}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Lessons Assigned</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{totalLessons}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Points</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{totalPoints}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-8 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left">
                  <SortHeader label="Student" sortKey="full_name" current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                {/* sm+ */}
                <th className="hidden sm:table-cell px-4 py-2.5 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned</span>
                </th>
                <th className="px-4 py-2.5 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Done</span>
                </th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In Progress</span>
                </th>
                {/* md+ */}
                <th className="hidden md:table-cell px-4 py-2.5 text-center">
                  <SortHeader label="Avg Score" sortKey="points" current={sortKey} dir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-2.5 text-right">
                  <SortHeader label="Points" sortKey="points" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                </th>
                <th className="hidden md:table-cell px-4 py-2.5 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Level</span>
                </th>
                {/* sm+ */}
                <th className="hidden sm:table-cell px-4 py-2.5 text-right">
                  <SortHeader label="Last Active" sortKey="last_active_at" current={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      {search ? `No students matching "${search}"` : 'No students found.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/academy/students/${student.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                        <Initials name={student.full_name ?? ''} />
                        <span className="text-sm font-medium text-foreground">{student.full_name ?? 'Unnamed'}</span>
                      </Link>
                    </td>
                    {/* sm+ */}
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <span className="text-sm text-foreground">{student.lessons_assigned}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{student.lessons_completed}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-center">
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{student.lessons_in_progress}</span>
                    </td>
                    {/* md+ */}
                    <td className="hidden md:table-cell px-4 py-3 text-center">
                      {student.average_quiz_score != null ? (
                        <span className={cn(
                          'text-sm',
                          student.average_quiz_score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        )}>
                          {student.average_quiz_score}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-foreground">{student.points}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-center">
                      {(() => {
                        const lvl = getLevel(student.points)
                        return (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <span className="text-sm leading-none">{LEVEL_PIECES[lvl]}</span>
                            {lvl}
                          </span>
                        )
                      })()}
                    </td>
                    {/* sm+ */}
                    <td className="hidden sm:table-cell px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(student.last_active_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </div>
  )
}