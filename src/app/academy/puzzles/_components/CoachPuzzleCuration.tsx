'use client'

import { useState, useTransition } from 'react'
import { Loader2, RefreshCw, Trash2, Check, Puzzle as PuzzleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { saveDailyPuzzleSet } from '@/actions/academy/dailyPuzzleActions'
import type { StoredPuzzle } from '@/services/dailyPuzzleService'

const THEME_PRESETS = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'fork', label: 'Forks' },
  { key: 'pin', label: 'Pins' },
  { key: 'skewer', label: 'Skewers' },
  { key: 'mateIn1', label: 'Mate in 1' },
  { key: 'mateIn2', label: 'Mate in 2' },
  { key: 'discoveredAttack', label: 'Discovered' },
  { key: 'sacrifice', label: 'Sacrifice' },
  { key: 'endgame', label: 'Endgame' },
  { key: 'hangingPiece', label: 'Hanging piece' },
] as const

const DIFFICULTIES = ['easier', 'normal', 'harder', 'mixed'] as const

interface Props {
  initialPuzzles: StoredPuzzle[]
}

export default function CoachPuzzleCuration({ initialPuzzles }: Props) {
  const [theme, setTheme]           = useState<string>('mixed')
  const [difficulty, setDifficulty] = useState<string>('normal')
  const [count, setCount]           = useState(12)
  const [puzzles, setPuzzles]       = useState<StoredPuzzle[]>(initialPuzzles)
  const [fetching, setFetching]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [saved, setSaved]           = useState(initialPuzzles.length > 0)
  const [isSaving, startSave]       = useTransition()

  const handleFetch = async () => {
    setFetching(true)
    setError(null)
    try {
      const res = await fetch(`/api/puzzles/lichess/batch?themes=${theme}&difficulty=${difficulty}&nb=${count}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to fetch puzzles')
      }
      const { puzzles: fetched } = await res.json() as { puzzles: StoredPuzzle[] }
      // Append, de-duplicating by lichessId.
      setPuzzles(prev => {
        const seen = new Set(prev.map(p => p.lichessId))
        return [...prev, ...fetched.filter(p => !seen.has(p.lichessId))]
      })
      setSaved(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch puzzles')
    } finally {
      setFetching(false)
    }
  }

  const removePuzzle = (id: string) => {
    setPuzzles(prev => prev.filter(p => p.lichessId !== id))
    setSaved(false)
  }

  const handlePublish = () => {
    startSave(async () => {
      try {
        await saveDailyPuzzleSet(puzzles)
        setSaved(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to publish')
      }
    })
  }

  const ratings = puzzles.map(p => p.rating ?? 0).filter(Boolean)
  const ratingRange = ratings.length
    ? `${Math.min(...ratings)}–${Math.max(...ratings)}`
    : '—'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <PuzzleIcon className="w-5 h-5 text-amber-500" /> Today&apos;s Puzzle Pool
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a pool of tactics for today. Each student sees a slice auto-matched to their
          rating. Solving grants points and moves their academy rating.
        </p>
      </div>

      {/* Fetch controls */}
      <div className="rounded-md border border-border bg-card p-4 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Theme</p>
          <div className="flex flex-wrap gap-1.5">
            {THEME_PRESETS.map(t => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-sm border transition-colors',
                  theme === t.key
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Difficulty</p>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-sm border capitalize transition-colors',
                    difficulty === d
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Count</p>
            <input
              type="number" min={1} max={50} value={count}
              onChange={e => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-20 text-sm px-2 py-1 rounded-sm border border-border bg-background"
            />
          </div>
          <Button onClick={handleFetch} disabled={fetching} variant="outline" size="sm" className="h-8 gap-1.5">
            {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Add puzzles
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {/* Pool */}
      <div className="rounded-md border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Pool <span className="ml-1 normal-case tracking-normal text-muted-foreground/60">{puzzles.length} puzzles · ratings {ratingRange}</span>
          </p>
          <Button onClick={handlePublish} disabled={isSaving || puzzles.length === 0} size="sm" className="h-8 gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
            {saved ? 'Published' : 'Publish set'}
          </Button>
        </div>

        {puzzles.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No puzzles yet. Pick a theme and difficulty, then add some.
          </p>
        ) : (
          <ul className="divide-y divide-border max-h-[50vh] overflow-y-auto">
            {puzzles.map((p, i) => (
              <li key={p.lichessId} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="text-xs text-muted-foreground tabular-nums w-6 shrink-0">{i + 1}</span>
                <span className="font-mono text-xs tabular-nums w-12 shrink-0">★ {p.rating ?? '—'}</span>
                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                  {p.themes.slice(0, 3).join(', ')}
                </span>
                <button
                  onClick={() => removePuzzle(p.lichessId)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
