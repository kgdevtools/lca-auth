'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Play, Square, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { startClassroomSession, endClassroomSession } from '@/actions/academy/classroomActions'
import type { ClassroomSession } from '@/services/classroomService'

interface SessionHeaderProps {
  session: ClassroomSession
  role: 'coach' | 'student'
}

function StatusDot({ status }: { status: ClassroomSession['status'] }) {
  if (status === 'active') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    )
  }
  if (status === 'scheduled') {
    return <span className="inline-flex rounded-full h-2 w-2 bg-amber-400" />
  }
  return <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/40" />
}

export default function SessionHeader({ session, role }: SessionHeaderProps) {
  const [copied, setCopied]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router                      = useRouter()

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStart = () => {
    setError(null)
    startTransition(async () => {
      try {
        await startClassroomSession(session.id)
        router.refresh()
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
        router.refresh()
      } catch (err: any) {
        setError(err?.message ?? 'Failed to end session')
      }
    })
  }

  const statusLabel = {
    scheduled: 'Scheduled',
    active:    'Live',
    ended:     'Ended',
  }[session.status]

  return (
    <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/academy/classroom"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="Back to classroom"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={session.status} />
          <h1 className="text-sm font-semibold text-foreground tracking-tight truncate">
            {session.title}
          </h1>
          <span className="text-xs text-muted-foreground flex-shrink-0">{statusLabel}</span>
        </div>

        {error && <span className="text-xs text-destructive flex-shrink-0">{error}</span>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Share link */}
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors h-7 px-2 rounded-sm hover:bg-muted"
          title="Copy session link"
        >
          {copied
            ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" /> Share link</>
          }
        </button>

        {/* Coach controls */}
        {role === 'coach' && session.status === 'scheduled' && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleStart}
            disabled={isPending}
          >
            <Play className="w-3 h-3" />
            Start session
          </Button>
        )}

        {role === 'coach' && session.status === 'active' && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={handleEnd}
            disabled={isPending}
          >
            <Square className="w-3 h-3" />
            End session
          </Button>
        )}
      </div>
    </div>
  )
}
