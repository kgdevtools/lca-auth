'use client'

import { X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PresenceUser } from '../_hooks/useClassroomChannel'

interface EnrolledStudent {
  id: string
  full_name: string
}

interface PresencePanelProps {
  users:             PresenceUser[]
  activeStudentId:   string | null | undefined
  mode:              'demonstration' | 'exercise' | undefined
  isCoach:           boolean
  sessionId?:        string
  onGrantPawn?:      (userId: string, name: string) => void
  enrolledStudents?: EnrolledStudent[]
  onRemoveStudent?:  (id: string) => void
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
      )}
      <span className={cn(
        'relative inline-flex rounded-full h-2 w-2',
        online ? 'bg-emerald-500' : 'bg-muted-foreground/30',
      )} />
    </span>
  )
}

interface UserRowProps {
  id:                 string
  name:               string
  role:               'coach' | 'student'
  online:             boolean
  handRaised:         boolean
  isActivePawnHolder: boolean
  showGrantPawn:      boolean
  showRemove:         boolean
  onGrantPawn?:       (userId: string, name: string) => void
  onRemove?:          (id: string) => void
}

function UserRow({
  id, name, role, online, handRaised, isActivePawnHolder,
  showGrantPawn, showRemove, onGrantPawn, onRemove,
}: UserRowProps) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-2 px-3 py-2 transition-colors',
      isActivePawnHolder && 'bg-amber-50 dark:bg-amber-950/20',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <OnlineDot online={online} />

        <span className={cn(
          'text-xs font-medium truncate',
          online ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {name}
        </span>

        {role === 'coach' && (
          <span className="text-[10px] font-medium text-muted-foreground flex-shrink-0 bg-muted px-1.5 py-0.5 rounded-sm">
            Coach
          </span>
        )}

        {handRaised && (
          <span className="text-base leading-none flex-shrink-0" title={`${name} has raised their hand`}>
            ✋
          </span>
        )}

        {isActivePawnHolder && (
          <span className="text-base leading-none flex-shrink-0" title={`${name} has the pawn`}>
            ♟
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {showGrantPawn && onGrantPawn && (
          <button
            onClick={() => onGrantPawn(id, name)}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-sm font-medium transition-colors',
              isActivePawnHolder
                ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {isActivePawnHolder ? 'Revoke' : 'Give ♟'}
          </button>
        )}

        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="p-0.5 rounded-sm text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove from session"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function PresencePanel({
  users,
  activeStudentId,
  mode,
  isCoach,
  onGrantPawn,
  enrolledStudents,
  onRemoveStudent,
}: PresencePanelProps) {
  // Build a presence map for O(1) lookup
  const onlineById = new Map(users.map(u => [u.userId, u]))

  // If enrolled list provided (coach view), render merged roster
  if (enrolledStudents) {
    const coaches = users.filter(u => u.role === 'coach')
    const enrolledSorted = [...enrolledStudents].sort((a, b) =>
      (a.full_name ?? '').localeCompare(b.full_name ?? ''),
    )

    if (coaches.length === 0 && enrolledStudents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
          <Users className="w-5 h-5 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No students enrolled yet.</p>
        </div>
      )
    }

    const onlineStudentCount = enrolledSorted.filter(s => onlineById.has(s.id)).length

    return (
      <div className="divide-y divide-border/60">
        {coaches.map(user => (
          <UserRow
            key={user.userId}
            id={user.userId}
            name={user.name}
            role="coach"
            online={true}
            handRaised={false}
            isActivePawnHolder={false}
            showGrantPawn={false}
            showRemove={false}
          />
        ))}

        {enrolledSorted.map(student => {
          const presence = onlineById.get(student.id)
          return (
            <UserRow
              key={student.id}
              id={student.id}
              name={student.full_name}
              role="student"
              online={!!presence}
              handRaised={presence?.handRaised ?? false}
              isActivePawnHolder={activeStudentId === student.id}
              showGrantPawn={isCoach && mode === 'exercise' && !!presence}
              showRemove={isCoach}
              onGrantPawn={onGrantPawn}
              onRemove={onRemoveStudent}
            />
          )
        })}

        {enrolledStudents.length > 0 && (
          <div className="px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground/60">
              {onlineStudentCount}/{enrolledStudents.length}{' '}
              {enrolledStudents.length === 1 ? 'student' : 'students'} online
            </p>
          </div>
        )}
      </div>
    )
  }

  // Fallback: presence-only view (StudentView path)
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
        <Users className="w-5 h-5 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">Waiting for participants…</p>
      </div>
    )
  }

  const coaches  = users.filter(u => u.role === 'coach')
  const students = users.filter(u => u.role === 'student')
  const sortedStudents = [...students].sort((a, b) => {
    if (a.handRaised !== b.handRaised) return a.handRaised ? -1 : 1
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  return (
    <div className="divide-y divide-border/60">
      {coaches.map(user => (
        <UserRow
          key={user.userId}
          id={user.userId}
          name={user.name}
          role="coach"
          online={true}
          handRaised={false}
          isActivePawnHolder={false}
          showGrantPawn={false}
          showRemove={false}
        />
      ))}

      {sortedStudents.map(user => (
        <UserRow
          key={user.userId}
          id={user.userId}
          name={user.name}
          role="student"
          online={true}
          handRaised={user.handRaised}
          isActivePawnHolder={activeStudentId === user.userId}
          showGrantPawn={isCoach && mode === 'exercise'}
          showRemove={false}
          onGrantPawn={onGrantPawn}
        />
      ))}

      {students.length > 0 && (
        <div className="px-3 py-1.5">
          <p className="text-[10px] text-muted-foreground/60">
            {students.length} {students.length === 1 ? 'student' : 'students'} connected
          </p>
        </div>
      )}
    </div>
  )
}
