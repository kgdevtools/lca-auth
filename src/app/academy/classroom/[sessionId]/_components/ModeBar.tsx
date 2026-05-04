'use client'

import { useTransition } from 'react'
import { Lock, Unlock, MonitorPlay, Sword } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setClassroomMode, freezeBoard } from '@/actions/academy/classroomActions'
import type { SessionMode } from '@/services/classroomService'

interface ModeBarProps {
  sessionId:           string
  mode:                SessionMode
  frozen:              boolean
  onModeChange:        (mode: SessionMode) => void
  onFrozenChange:      (frozen: boolean) => void
  onBroadcastMode?:    (mode: SessionMode) => Promise<void>
  onBroadcastFreeze?:  (frozen: boolean)  => Promise<void>
  disabled?:           boolean
}

export default function ModeBar({
  sessionId,
  mode,
  frozen,
  onModeChange,
  onFrozenChange,
  onBroadcastMode,
  onBroadcastFreeze,
  disabled = false,
}: ModeBarProps) {
  const [isPending, startTransition] = useTransition()

  const handleMode = (next: SessionMode) => {
    if (next === mode) return
    onModeChange(next)
    startTransition(async () => {
      try {
        await Promise.all([
          setClassroomMode(sessionId, next),
          onBroadcastMode?.(next),
        ])
      } catch {}
    })
  }

  const handleFreeze = () => {
    const next = !frozen
    onFrozenChange(next)
    startTransition(async () => {
      try {
        await Promise.all([
          freezeBoard(sessionId, next),
          onBroadcastFreeze?.(next),
        ])
      } catch {}
    })
  }

  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 border-b border-border bg-muted/30">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-1.5">
        Mode
      </span>

      <button
        onClick={() => handleMode('demonstration')}
        disabled={disabled || isPending}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm transition-colors font-medium',
          mode === 'demonstration'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <MonitorPlay className="w-3.5 h-3.5" />
        Demonstration
      </button>

      <button
        onClick={() => handleMode('exercise')}
        disabled={disabled || isPending}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm transition-colors font-medium',
          mode === 'exercise'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <Sword className="w-3.5 h-3.5" />
        Exercise
      </button>

      <div className="flex-1" />

      <button
        onClick={handleFreeze}
        disabled={disabled || isPending}
        title={frozen ? 'Unfreeze board' : 'Freeze board'}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm transition-colors font-medium',
          frozen
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        {frozen
          ? <><Lock className="w-3.5 h-3.5" /> Frozen</>
          : <><Unlock className="w-3.5 h-3.5" /> Freeze</>
        }
      </button>
    </div>
  )
}
