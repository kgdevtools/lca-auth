'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LeaderboardRow {
  studentId:   string
  fullName:    string | null
  totalPoints: number
  level:       number
  tier:        string | null
}

interface LeaderboardClientProps {
  rows:              LeaderboardRow[]
  currentStudentId:  string
}

const LEVEL_NAMES: Record<number, string> = { 1: 'Pawn', 2: 'Knight', 3: 'Bishop', 4: 'Rook', 5: 'Queen', 6: 'King' }
const LEVEL_PIECES: Record<number, string> = { 1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

type Tier = 'all' | 'beginner' | 'intermediate' | 'advanced'
const TABS: { value: Tier; label: string }[] = [
  { value: 'all',          label: 'All'          },
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
]

const MEDAL = ['🥇', '🥈', '🥉']

function Initials({ name }: { name: string | null }) {
  const n = name ?? '?'
  const parts = n.trim().split(' ')
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : n.slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0">
      <span className="text-[11px] font-bold text-foreground/60 uppercase">{letters}</span>
    </div>
  )
}

export default function LeaderboardClient({ rows, currentStudentId }: LeaderboardClientProps) {
  const [activeTier, setActiveTier] = useState<Tier>('all')

  const filtered = rows.filter(r =>
    activeTier === 'all' ? true : r.tier === activeTier
  )

  const currentRank = rows.findIndex(r => r.studentId === currentStudentId) + 1

  return (
    <div className="max-w-3xl mx-auto px-5 py-7">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          Leaderboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top 20 students by points
          {currentRank > 0 && (
            <span className="ml-2 font-medium text-foreground">· You are #{currentRank}</span>
          )}
        </p>
      </div>

      {/* Tier tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTier(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTier === tab.value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No students in this tier yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((row) => {
            const isCurrentUser = row.studentId === currentStudentId
            const rank = rows.findIndex(r => r.studentId === row.studentId) + 1

            return (
              <div
                key={row.studentId}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors',
                  isCurrentUser
                    ? 'border-foreground/30 bg-foreground/[0.04]'
                    : 'border-border bg-card hover:bg-muted/30'
                )}
              >
                {/* Rank */}
                <div className="w-7 text-center flex-shrink-0">
                  {rank <= 3 ? (
                    <span className="text-base leading-none">{MEDAL[rank - 1]}</span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <Initials name={row.fullName} />

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isCurrentUser ? 'text-foreground' : 'text-foreground')}>
                    {row.fullName ?? 'Student'}
                    {isCurrentUser && <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {LEVEL_PIECES[row.level]} {LEVEL_NAMES[row.level] ?? 'Pawn'}
                  </p>
                </div>

                {/* Tier badge */}
                {row.tier && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border flex-shrink-0">
                    {row.tier}
                  </span>
                )}

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold tabular-nums text-foreground">{row.totalPoints}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
