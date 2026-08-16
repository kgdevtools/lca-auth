'use client'

import { useState, useEffect, useTransition } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGameLogAction } from '@/actions/academy/gameLogActions'
import type { GameLogEntry, GameResult } from '@/repositories/lesson/gameLogRepository'
import GameLogBoardEditor from './GameLogBoardEditor'

// Game Log — Sheet 1 of the Coach Game Performance Reports feature (ported
// from Chess_Dashboard.xlsx). Dashboard/Charts are separate, later phases.
//
// One modal (GameLogBoardEditor.tsx) handles both "+ Add game" and clicking
// an existing row — board + PGN editor (Manual/Lichess/Import PGN, synced
// Moves tab, decorations) plus Details/Moves/Preview tabs, including the
// Rate scoring section that used to be its own separate modal.

const RESULT_LABEL: Record<GameResult, string> = { win: 'Win', draw: 'Draw', loss: 'Loss' }
const RESULT_COLOR: Record<GameResult, string> = {
  win: 'text-emerald-600 dark:text-emerald-400',
  draw: 'text-amber-600 dark:text-amber-400',
  loss: 'text-red-600 dark:text-red-400',
}

interface GamePerformancePanelProps {
  studentId: string
  studentName: string
}

export default function GamePerformancePanel({ studentId, studentName }: GamePerformancePanelProps) {
  const [games, setGames] = useState<GameLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddEditor, setShowAddEditor] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const loadGames = (id: string) => {
    startTransition(async () => {
      try {
        const data = await getGameLogAction(id)
        setGames(data)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load game log')
      }
    })
  }

  useEffect(() => {
    setGames(null)
    setShowAddEditor(false)
    loadGames(studentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Game Performance</h3>
        <button
          onClick={() => setShowAddEditor(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add game
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {games === null ? (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No games logged yet.</p>
        </div>
      ) : (
        <GameLogTable games={games} onSelectGame={g => setEditingGameId(g.id)} />
      )}

      {(showAddEditor || editingGameId) && (
        <GameLogBoardEditor
          studentId={studentId}
          studentName={studentName}
          open
          existingGameId={editingGameId ?? undefined}
          onClose={() => { setShowAddEditor(false); setEditingGameId(null) }}
          onSaved={() => { setShowAddEditor(false); setEditingGameId(null); loadGames(studentId) }}
        />
      )}
    </div>
  )
}

// ── Game Log table ───────────────────────────────────────────────────────────

function GameLogTable({ games, onSelectGame }: { games: GameLogEntry[]; onSelectGame: (game: GameLogEntry) => void }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Date</th>
            <th className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Opponent</th>
            <th className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Event</th>
            <th className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Result</th>
            <th className="text-right font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Scored</th>
            <th className="text-right font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-3 py-2">Overall</th>
          </tr>
        </thead>
        <tbody>
          {games.map(g => (
            <tr
              key={g.id}
              onClick={() => onSelectGame(g)}
              className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              title="Click to view or edit this game"
            >
              <td className="px-3 py-2 text-foreground/80 whitespace-nowrap">
                {new Date(g.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-3 py-2 text-foreground/80">{g.opponent ?? '—'}</td>
              <td className="px-3 py-2 text-foreground/80">{g.event ?? '—'}</td>
              <td className={cn('px-3 py-2 font-medium', RESULT_COLOR[g.result])}>{RESULT_LABEL[g.result]}</td>
              <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{g.criteria_scored_count}/27</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {g.overall_score != null ? `${g.overall_score}/100` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
