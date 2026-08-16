'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLichessGamesForStudentAction, type LichessGamePickOption } from '@/actions/academy/gameLogActions'
import type { GameResult } from '@/lib/gameAssessment'

const RESULT_LABEL: Record<GameResult, string> = { win: 'Win', draw: 'Draw', loss: 'Loss' }
const RESULT_COLOR: Record<GameResult, string> = {
  win: 'text-emerald-600 dark:text-emerald-400',
  draw: 'text-amber-600 dark:text-amber-400',
  loss: 'text-red-600 dark:text-red-400',
}

// Extracted out of GamePerformancePanel.tsx so GameLogBoardEditor can reuse
// it too — metadata-only picker list (date/opponent/result/opening); the
// caller is responsible for fetching the full PGN via getLichessGamePgnAction
// once a game is actually picked (kept separate so this list stays cheap).
export default function LichessGamePicker({
  studentId,
  selectedGameId,
  onPick,
}: {
  studentId: string
  selectedGameId: string | null
  onPick: (game: LichessGamePickOption) => void
}) {
  const [state, setState] = useState<'loading' | 'not-connected' | 'ready'>('loading')
  const [username, setUsername] = useState<string | null>(null)
  const [games, setGames] = useState<LichessGamePickOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    getLichessGamesForStudentAction(studentId)
      .then(res => {
        if (cancelled) return
        setUsername(res.username)
        setGames(res.games)
        setState(res.connected ? 'ready' : 'not-connected')
      })
      .catch(e => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load Lichess games')
        setState('not-connected')
      })
    return () => { cancelled = true }
  }, [studentId])

  if (state === 'loading') {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-4 text-center">
        <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
      </div>
    )
  }

  if (state === 'not-connected') {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
        {error ?? `This student hasn't connected a Lichess account, or the connection isn't active — log this game manually instead.`}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
        No recent decisive games found for {username} — log this one manually instead.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border max-h-48 overflow-y-auto divide-y divide-border">
      {games.map(g => (
        <button
          key={g.lichessGameId}
          onClick={() => onPick(g)}
          className={cn(
            'w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors',
            selectedGameId === g.lichessGameId ? 'bg-foreground/5' : 'hover:bg-muted/40'
          )}
        >
          <span className="text-muted-foreground shrink-0">{g.date}</span>
          <span className="flex-1 min-w-0 truncate text-foreground/80">vs {g.opponent}</span>
          <span className="text-muted-foreground shrink-0 truncate max-w-[40%]">{g.opening ?? g.eco ?? ''}</span>
          <span className={cn('font-medium shrink-0', RESULT_COLOR[g.result])}>{RESULT_LABEL[g.result]}</span>
        </button>
      ))}
    </div>
  )
}
