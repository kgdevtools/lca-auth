'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Copy, Check, Play, Square, ArrowRight, MonitorPlay } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startClassroomSession, endClassroomSession } from '@/actions/academy/classroomActions'
import type { ClassroomSession } from '@/services/classroomService'
import ClassroomRealtimeSync from '@/components/classroom/ClassroomRealtimeSync'

interface Props {
  role: 'coach' | 'student'
  sessions: ClassroomSession[]
  activeSession: ClassroomSession | null
  upcomingSessions?: ClassroomSession[]
  currentUserId: string
}

function StatusBadge({ status }: { status: ClassroomSession['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Live
      </span>
    )
  }
  if (status === 'scheduled') {
    return (
      <span className="inline-flex items-center text-[11px] font-medium text-amber-600">
        Scheduled
      </span>
    )
  }
  return (
    <span className="text-[11px] font-medium text-muted-foreground">Ended</span>
  )
}

function CopyLinkButton({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/academy/classroom/${sessionId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copy session link"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function CoachSessionRow({ session }: { session: ClassroomSession }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleStart = () => {
    setError(null)
    startTransition(async () => {
      try {
        await startClassroomSession(session.id)
        router.push(`/academy/classroom/${session.id}`)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to start session')
      }
    })
  }

  const handleEnd = () => {
    setError(null)
    startTransition(async () => {
      try {
        await endClassroomSession(session.id)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to end session')
      }
    })
  }

  const date = new Date(session.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-1">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <StatusBadge status={session.status} />
          <span className="text-[11px] text-muted-foreground">{date}</span>
          {error && <span className="text-[11px] text-destructive">{error}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <CopyLinkButton sessionId={session.id} />

        {session.status === 'scheduled' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={handleStart}
            disabled={isPending}
          >
            <Play className="w-3 h-3" />
            Start
          </Button>
        )}

        {session.status === 'active' && (
          <>
            <Link href={`/academy/classroom/${session.id}`}>
              <Button size="sm" className="h-7 text-xs gap-1.5">
                <ArrowRight className="w-3 h-3" />
                Go to session
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
              onClick={handleEnd}
              disabled={isPending}
            >
              <Square className="w-3 h-3" />
              End
            </Button>
          </>
        )}

        {session.status === 'ended' && (
          <Link href={`/academy/classroom/${session.id}`}>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-muted-foreground">
              View
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function ClassroomListClient({ role, sessions, activeSession, upcomingSessions = [], currentUserId }: Props) {
  if (role === 'coach') {
    return (
      <div className="max-w-4xl mx-auto px-5 py-7">
        <ClassroomRealtimeSync userId={currentUserId} role="coach" />
        {/* Header */}
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
              Classroom Sessions
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and manage your live teaching sessions
              {sessions.length > 0 && (
                <span className="ml-2 font-medium text-foreground/60">
                  · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
              )}
            </p>
          </div>
          <Link href="/academy/classroom/new">
            <Button size="sm" className="flex items-center gap-1.5 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
              New session
            </Button>
          </Link>
        </div>

        {/* Active session banner */}
        {activeSession && (
          <div className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {activeSession.title} is live now
              </p>
            </div>
            <Link href={`/academy/classroom/${activeSession.id}`}>
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                <MonitorPlay className="w-3.5 h-3.5" />
                Go to session
              </Button>
            </Link>
          </div>
        )}

        {/* Session list */}
        {sessions.length === 0 ? (
          <div className="rounded-sm border border-border bg-card px-6 py-14 text-center">
            <p className="text-sm font-medium text-foreground mb-1">No sessions yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create a session to start teaching live.
            </p>
            <Link href="/academy/classroom/new">
              <Button size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create first session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-sm border border-border bg-card divide-y divide-border px-4">
            {sessions.map(session => (
              <CoachSessionRow key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Student view
  return (
    <div className="max-w-4xl mx-auto px-5 py-7">
      <ClassroomRealtimeSync userId={currentUserId} role="student" />
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          Classroom
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Join your coach's live teaching sessions
        </p>
      </div>

      {/* Active session join banner */}
      {activeSession ? (
        <div className="mb-5 rounded-sm border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Your coach is live right now
              </p>
            </div>
            <p className="text-base font-semibold text-foreground">{activeSession.title}</p>
          </div>
          <Link href={`/academy/classroom/${activeSession.id}`}>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 flex-shrink-0">
              <MonitorPlay className="w-3.5 h-3.5" />
              Join class
            </Button>
          </Link>
        </div>
      ) : upcomingSessions.length === 0 && sessions.length === 0 ? (
        <div className="mb-7 rounded-sm border border-border bg-card px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground mb-1">No active session</p>
          <p className="text-xs text-muted-foreground">
            Your coach hasn't started a live session yet. Check back soon.
          </p>
        </div>
      ) : null}

      {/* Upcoming scheduled sessions */}
      {upcomingSessions.length > 0 && (
        <div className="mb-7">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming
          </h2>
          <div className="rounded-sm border border-border bg-card divide-y divide-border px-4">
            {upcomingSessions.map(session => {
              const date = new Date(session.created_at).toLocaleDateString('en-ZA', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
              return (
                <div key={session.id} className="flex items-center justify-between gap-4 py-3.5 px-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="inline-flex items-center text-[11px] font-medium text-amber-600">
                        Scheduled
                      </span>
                      <span className="text-[11px] text-muted-foreground">{date}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Past sessions */}
      {sessions.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Past Sessions
          </h2>
          <div className="rounded-sm border border-border bg-card divide-y divide-border px-4">
            {sessions.map(session => {
              const date = new Date(session.ended_at ?? session.created_at).toLocaleDateString('en-ZA', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
              return (
                <div key={session.id} className="flex items-center justify-between gap-4 py-3.5 px-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
                  </div>
                  <Link href={`/academy/classroom/${session.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-muted-foreground">
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
