'use client'

import { useState, useTransition } from 'react'
import { addCoachToStudent, removeCoachFromStudent } from '@/actions/academy/coachActions'
import { Loader2, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileRow {
  id: string
  full_name: string | null
  role: string | null
}

interface StudentRow {
  student: ProfileRow
  coaches: ProfileRow[]
}

interface AssignmentsClientProps {
  studentsWithCoaches: StudentRow[]
  coaches: ProfileRow[]
}

// ── Initials avatar ───────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2)
  return (
    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-semibold text-foreground/60 uppercase">{letters}</span>
    </div>
  )
}

// ── Single row ────────────────────────────────────────────────────────────────

function AssignmentRow({
  row,
  coaches,
}: {
  row: StudentRow
  coaches: ProfileRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [localCoaches, setLocalCoaches] = useState<ProfileRow[]>(row.coaches)

  const studentName = row.student.full_name ?? 'Unnamed student'
  const available = coaches.filter(c => !localCoaches.some(lc => lc.id === c.id))

  const handleAdd = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId)
    if (!coach) return
    setLocalCoaches(prev => [...prev, coach])
    startTransition(async () => {
      try {
        await addCoachToStudent(row.student.id, coachId)
      } catch (err) {
        setLocalCoaches(prev => prev.filter(c => c.id !== coachId))
        alert(err instanceof Error ? err.message : 'Failed to assign coach')
      }
    })
  }

  const handleRemove = (coachId: string) => {
    setLocalCoaches(prev => prev.filter(c => c.id !== coachId))
    startTransition(async () => {
      try {
        await removeCoachFromStudent(row.student.id, coachId)
      } catch (err) {
        const coach = coaches.find(c => c.id === coachId)
        if (coach) setLocalCoaches(prev => [...prev, coach])
        alert(err instanceof Error ? err.message : 'Failed to remove coach')
      }
    })
  }

  return (
    <div className={cn(
      'flex items-start gap-4 px-4 py-3 border-b border-border/50 last:border-0',
      isPending && 'opacity-60'
    )}>
      {/* Student */}
      <div className="flex items-center gap-2.5 w-[200px] flex-shrink-0 pt-0.5">
        <Initials name={studentName} />
        <span className="text-sm font-medium truncate">{studentName}</span>
      </div>

      {/* Coaches */}
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {localCoaches.map(coach => (
            <div
              key={coach.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground/[0.07] border border-border/50 text-xs font-medium text-foreground"
            >
              <span>{coach.full_name ?? 'Unnamed'}</span>
              <button
                type="button"
                onClick={() => handleRemove(coach.id)}
                disabled={isPending}
                className="ml-0.5 hover:text-destructive transition-colors disabled:opacity-40"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {localCoaches.length === 0 && (
            <span className="text-xs text-muted-foreground pt-0.5">No coaches assigned</span>
          )}
        </div>

        {available.length > 0 && (
          <div className="relative inline-block">
            <select
              value=""
              onChange={e => { if (e.target.value) handleAdd(e.target.value) }}
              disabled={isPending}
              className={cn(
                'appearance-none pl-2 pr-7 py-1 rounded-md text-xs',
                'border border-border/60 bg-background text-muted-foreground',
                'focus:outline-none focus:ring-1 focus:ring-foreground/20',
                'disabled:opacity-40 cursor-pointer hover:border-border'
              )}
            >
              <option value="">+ Add coach…</option>
              {available.map(c => (
                <option key={c.id} value={c.id}>{c.full_name ?? 'Unnamed'}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Spinner */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center pt-1">
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export default function AssignmentsClient({
  studentsWithCoaches,
  coaches,
}: AssignmentsClientProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')

  const filtered = studentsWithCoaches.filter(row => {
    const name = (row.student.full_name ?? '').toLowerCase()
    const matchesSearch = name.includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all'        ? true :
      filter === 'assigned'   ? row.coaches.length > 0 :
      row.coaches.length === 0
    return matchesSearch && matchesFilter
  })

  const assignedCount   = studentsWithCoaches.filter(r => r.coaches.length > 0).length
  const unassignedCount = studentsWithCoaches.length - assignedCount

  return (
    <div className="space-y-4">

      {/* Summary strips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total students', value: studentsWithCoaches.length },
          { label: 'Assigned',       value: assignedCount,   accent: true },
          { label: 'Unassigned',     value: unassignedCount, warn: unassignedCount > 0 },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{s.label}</p>
            <p className={cn(
              'text-2xl font-bold tracking-tight',
              s.warn && s.value > 0 ? 'text-amber-500' : 'text-foreground'
            )}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-8 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
          {(['all', 'assigned', 'unassigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors',
                filter === f
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground w-[200px] flex-shrink-0">
            Student
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">
            Coaches
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? `No students matching "${search}"` : 'No students found.'}
            </p>
          </div>
        ) : (
          filtered.map(row => (
            <AssignmentRow
              key={row.student.id}
              row={row}
              coaches={coaches}
            />
          ))
        )}
      </div>

    </div>
  )
}
