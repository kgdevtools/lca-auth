'use client'

import React, { useState } from 'react'
import { Loader2, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfilePageData, UserGame } from '../actions'
import { addConfirmedAlias } from '../actions'
import { getActivePlayerData, getPlayerStatistics } from '../tournament-actions'

interface Props extends ProfilePageData {
  games: UserGame[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0)  return 'today'
  if (days === 1)  return 'yesterday'
  if (days < 7)   return `${days}d ago`
  if (days < 30)  return `${Math.floor(days / 7)}w ago`
  return shortDate(dateStr)
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
  collapsible = false,
}: {
  label:        string
  count?:       number
  children:     React.ReactNode
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)

  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <button
        onClick={() => collapsible && setOpen(v => !v)}
        className={cn(
          'flex items-baseline gap-2 mb-3 w-full text-left',
          collapsible && 'cursor-pointer'
        )}
        disabled={!collapsible}
      >
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </span>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground/50">{count}</span>
        )}
        {collapsible && (
          <ChevronDown
            className={cn(
              'w-3 h-3 text-muted-foreground/50 ml-auto transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>
      {open && children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground/60 py-1">{text}</p>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TournamentsView({
  profile,
  activePlayerData,
  playerStats,
  matchResult,
  games,
}: Props) {
  const playerName    = profile?.tournament_fullname || profile?.full_name || ''
  const hasTournData  = Boolean(profile?.tournament_fullname)

  // Merge state for "Is this you?" close-matches feature
  const [loadingPlayer, setLoadingPlayer]     = useState<string | null>(null)
  const [mergedData, setMergedData]           = useState(activePlayerData)
  const [mergedStats, setMergedStats]         = useState(playerStats)
  const [confirmedMatches, setConfirmedMatches] = useState<Set<string>>(new Set())

  const handleSelectPlayer = async (name: string, uniqueNo: string) => {
    setLoadingPlayer(name)
    try {
      const [newData, newStats] = await Promise.all([
        getActivePlayerData(name),
        getPlayerStatistics(name),
      ])

      if (newData && newStats && mergedStats) {
        const combined = [...mergedData]
        newData.forEach(t => {
          const exists = combined.some(
            e => e.tournament_name === t.tournament_name && e.created_at === t.created_at
          )
          if (!exists) combined.push(t)
        })

        const maxRating  = Math.max(
          Number(mergedStats.latestRating  || 0),
          Number(newStats.latestRating     || 0),
        )
        const maxHighest = Math.max(
          Number(mergedStats.highestRating || 0),
          Number(newStats.highestRating    || 0),
        )
        const totalTournaments = mergedStats.tournaments + newStats.tournaments
        const avgPerf = totalTournaments > 0
          ? ((Number(mergedStats.avgPerformance || 0) * mergedStats.tournaments) +
             (Number(newStats.avgPerformance    || 0) * newStats.tournaments)) / totalTournaments
          : 0

        setMergedData(combined)
        setMergedStats({
          totalGames:     mergedStats.totalGames + newStats.totalGames,
          tournaments:    totalTournaments,
          latestRating:   String(maxRating),
          highestRating:  maxHighest,
          avgPerformance: avgPerf,
          federation:     mergedStats.federation || newStats.federation,
          chessaId:       uniqueNo || mergedStats.chessaId || newStats.chessaId,
        })
        setConfirmedMatches(prev => new Set(prev).add(name))
        addConfirmedAlias(name).catch(() => {})
      }
    } catch (e) {
      console.error('Error merging player:', e)
    } finally {
      setLoadingPlayer(null)
    }
  }

  // Sort tournaments by date descending
  const sortedTournaments = [...(mergedData ?? [])]
    .sort((a, b) => ((b.created_at ?? '') > (a.created_at ?? '') ? 1 : -1))

  const hasCloseMatches = matchResult &&
    (matchResult.exactMatch || matchResult.closeMatches.length > 0)

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="pb-5 border-b border-border">
          <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
            Tournaments
          </h1>
          {playerName && (
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              {playerName}
            </p>
          )}
        </div>

        {/* No tournament name set */}
        {!hasTournData && (
          <div className="py-8">
            <p className="text-sm text-muted-foreground mb-2">
              Set your tournament name in your profile to see your history.
            </p>
            <a
              href="/user/profile"
              className="text-sm font-mono font-semibold hover:underline"
            >
              Edit profile →
            </a>
          </div>
        )}

        {hasTournData && (
          <>
            {/* ── Stats strip ─────────────────────────────────────────── */}
            {mergedStats && (
              <div className="py-4 border-b border-border flex flex-wrap items-center gap-x-5 gap-y-3">
                {[
                  { label: 'Tournaments',  value: mergedStats.tournaments },
                  { label: 'Games',        value: mergedStats.totalGames },
                  { label: 'Rating',       value: mergedStats.latestRating || '—' },
                  { label: 'Best',         value: mergedStats.highestRating || '—' },
                  mergedStats.avgPerformance
                    ? { label: 'Avg Perf', value: typeof mergedStats.avgPerformance === 'number'
                        ? mergedStats.avgPerformance.toFixed(0)
                        : mergedStats.avgPerformance }
                    : null,
                  mergedStats.federation
                    ? { label: 'Fed', value: mergedStats.federation }
                    : null,
                ].filter(Boolean).map((s: any, i, arr) => (
                  <React.Fragment key={s.label}>
                    <div>
                      <p className="font-mono font-bold text-base leading-none tracking-tight">
                        {s.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-px h-6 bg-border hidden sm:block" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* ── Tournament history ───────────────────────────────────── */}
            <Section label="Tournament History" count={sortedTournaments.length}>
              {sortedTournaments.length === 0 ? (
                <EmptyState text="No tournament data found." />
              ) : (
                <div className="divide-y divide-border/50">
                  {sortedTournaments.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm font-medium text-foreground truncate leading-tight">
                        {t.tournament_name || 'Unknown Tournament'}
                      </span>
                      <div className="flex items-center gap-2.5 flex-shrink-0 text-[11px] font-mono text-muted-foreground">
                        {(t.RATING || t.player_rating) && (
                          <span>{t.RATING || t.player_rating}</span>
                        )}
                        {t.performance_rating && (
                          <span className="text-muted-foreground/50">
                            ({t.performance_rating})
                          </span>
                        )}
                        {t.created_at && (
                          <span className="text-muted-foreground/50 text-[10px]">
                            {shortDate(t.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Games ───────────────────────────────────────────────── */}
            <Section label="Games" count={games.length}>
              {games.length === 0 ? (
                <EmptyState text="No games found in the database for your name." />
              ) : (
                <div className="divide-y divide-border/50">
                  {games.map(game => {
                    const myName   = (profile?.tournament_fullname ?? '').toLowerCase()
                    const firstName = myName.split(' ')[0]
                    const isWhite  = (game.white ?? '').toLowerCase().includes(firstName)
                    const result   = game.result

                    const won  = (result === '1-0' && isWhite) || (result === '0-1' && !isWhite)
                    const drew = result === '1/2-1/2'

                    return (
                      <div key={game.id} className="py-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-foreground leading-tight truncate">
                            {game.white}
                            <span className="text-muted-foreground font-normal mx-1">vs</span>
                            {game.black}
                          </span>
                          <span className={cn(
                            'text-[11px] font-mono font-semibold flex-shrink-0',
                            won  && 'text-green-600 dark:text-green-500',
                            drew && 'text-amber-500',
                            !won && !drew && 'text-muted-foreground',
                          )}>
                            {result || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span className="truncate">{game.tournament}</span>
                          {game.created_at && (
                            <>
                              <span className="text-border flex-shrink-0">·</span>
                              <span className="flex-shrink-0">{relativeDate(game.created_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

            {/* ── Similar profiles (close matches) ────────────────────── */}
            {hasCloseMatches && (
              <Section label="Similar Profiles" collapsible>
                <p className="text-xs text-muted-foreground mb-3">
                  Similar names found in the database. Confirm any that belong to you to combine your stats.
                </p>

                {matchResult.exactMatch && (
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="text-[10px] font-mono text-green-600 dark:text-green-500 font-semibold">
                      ✓ exact
                    </span>
                    <span className="text-sm font-medium">{matchResult.exactMatch}</span>
                  </div>
                )}

                {matchResult.closeMatches.map((match, i) => {
                  const isConfirmed = confirmedMatches.has(match.name)
                  const isLoading   = loadingPlayer === match.name
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{match.name}</span>
                        {match.unique_no && (
                          <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                            #{match.unique_no}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectPlayer(match.name, match.unique_no || '')}
                        disabled={isLoading || isConfirmed}
                        className={cn(
                          'text-[11px] font-mono px-2.5 py-1 rounded-sm transition-colors flex-shrink-0',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          isConfirmed
                            ? 'bg-green-600/10 text-green-600 dark:text-green-500 border border-green-600/20'
                            : 'border border-border hover:bg-muted text-foreground',
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isConfirmed ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          'Is this you?'
                        )}
                      </button>
                    </div>
                  )
                })}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
