import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { Card, CardContent } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { parsePGNTags, enhancedFuzzyScore } from '@/services/pgnService'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tournament Games',
  description: 'View your individual tournament games',
}

type TournamentMeta = {
  id: string | number
  table_name: string
  display_name: string
}

type GameRow = {
  id: string
  title?: string
  pgn: string
  created_at?: string | null
  white?: string
  black?: string
  score?: number
  tournament?: string
  table_name?: string
}

// Use shared parsing and matching from the service

export default async function TournamentGamesPage() {
  const supabase = await createClient()

  let profile
  try {
    const r = await getCurrentUserWithProfile()
    profile = r.profile
  } catch (e) {
    redirect('/login')
  }

  const playerName = (profile?.tournament_fullname || profile?.full_name || '').trim()
  console.log('TournamentGames: detected playerName=', playerName)

  const { data: tournamentsMeta } = await supabase
    .from('tournaments_meta')
    .select('id, name, alias')
    .order('name', { ascending: true })

  const tournamentsList: TournamentMeta[] = (tournamentsMeta || []).map((t: any) => ({
    id: t.id,
    table_name: t.name,
    display_name: t.alias || (typeof t.name === 'string' ? t.name.replace(/_games$/, '').replace(/_/g, ' ') : t.name),
  }))
  console.log('TournamentGames: loaded tournaments count=', tournamentsList.length)
  if ((tournamentsMeta || []).length && process.env.NODE_ENV !== 'production') {
    try {
      console.log('TournamentGames: tournamentsMeta sample=', JSON.stringify((tournamentsMeta || []).slice(0, 10)))
    } catch (e) {
      console.log('TournamentGames: tournamentsMeta sample logging error', e)
    }
  }

  const tableNameRegex = /^[a-z0-9_]+$/

  const matchesByTournament: Record<string, GameRow[]> = {}
  let totalMatches = 0

  if (playerName) {
    // For each tournament, fetch games server-side and filter in JS using fuzzy matching on White/Black tags
    for (const t of tournamentsList) {
      try {
        if (!t.table_name || !tableNameRegex.test(t.table_name)) continue
        const { data: rows, error } = await supabase
          .from(t.table_name)
          .select('id, title, pgn, created_at')
          .limit(500)
      
        if (error) {
          console.error('Error loading table', t.table_name, error)
          continue
        }

        console.log(`TournamentGames: fetched ${Array.isArray(rows) ? rows.length : 0} rows from table ${t.table_name}`)
        if (Array.isArray(rows) && rows.length > 0 && process.env.NODE_ENV !== 'production') {
          try {
            const sample = rows.slice(0, 3).map((r: any) => ({ id: r.id, title: r.title || null, pgnType: typeof r.pgn }))
            console.log(`TournamentGames: sample rows from ${t.table_name}=`, JSON.stringify(sample))
          } catch (e) {
            console.log('TournamentGames: sample rows logging error', e)
          }
        }

        const matches: GameRow[] = []
        for (const r of (rows || [])) {
            const parsed = parsePGNTags(r.pgn)
            const white = parsed.white || ''
            const black = parsed.black || ''
            const scoreW = enhancedFuzzyScore(white, playerName)
            const scoreB = enhancedFuzzyScore(black, playerName)
          const best = Math.max(scoreW, scoreB)
          // Accept matches that are close enough or where normalized substrings appear
          if (best >= 0.6) {
            matches.push({
              id: String(r.id),
              title: r.title || '',
              pgn: parsed.pgn,
              created_at: r.created_at || null,
              white,
              black,
              score: best,
              tournament: t.display_name,
              table_name: t.table_name,
            })
          }
        }

        if (matches.length > 0) {
          matchesByTournament[t.table_name] = matches.sort((a, b) => (b.score || 0) - (a.score || 0))
          totalMatches += matches.length
          console.log(`TournamentGames: matches for ${t.table_name} = ${matches.length}`)
          if (process.env.NODE_ENV !== 'production') {
            try {
              console.log(`TournamentGames: sample matches for ${t.table_name}=`, JSON.stringify(matches.slice(0, 4).map(m => ({ id: m.id, white: m.white, black: m.black, score: m.score }))))
            } catch (e) {
              console.log('TournamentGames: sample matches logging error', e)
            }
          }
        }
      } catch (e) {
        console.error('error fetching games', e)
      }
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <WarningBanner message="Server-side PGN matching enabled; fuzzy matches shown." />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold">Tournament Games</h1>
        <p className="text-sm text-muted-foreground mt-1">Two-column view: tournaments (left) and matched games (right)</p>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="space-y-2">
                <div className="text-sm font-medium">Tournaments</div>
                <div className="text-xs text-muted-foreground">Click a tournament to view its matched games</div>
                <div className="mt-3 border rounded-md overflow-auto max-h-[60vh]">
                  <ul className="p-2">
                    {tournamentsList.map(t => (
                      <li key={t.table_name} className="flex justify-between items-center px-2 py-2 text-sm">
                        <span className="truncate">{t.display_name}</span>
                        <span className="text-xs text-muted-foreground">{matchesByTournament[t.table_name]?.length || 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-medium flex justify-between">
                <div>Matched Games</div>
                <div className="text-xs text-muted-foreground">Player: {playerName || '—'}</div>
              </div>

              <div className="mt-3 space-y-4 max-h-[70vh] overflow-auto">
                {Object.keys(matchesByTournament).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No matched games found for your tournament name.</div>
                ) : (
                  Object.entries(matchesByTournament).map(([tableName, games]) => {
                    const display = (tournamentsList.find(t => t.table_name === tableName)?.display_name) || tableName
                    return (
                      <section key={tableName}>
                        <h3 className="text-sm font-semibold mt-2">{display} <span className="text-xs text-muted-foreground">({games.length})</span></h3>
                        <ul className="mt-2 space-y-2">
                          {games.map(g => (
                            <li key={g.id} className="p-3 border rounded-md">
                              <div className="flex justify-between items-baseline">
                                <div className="text-sm font-medium">{g.title || 'Untitled'}</div>
                                <div className="text-xs text-muted-foreground">{g.created_at ? new Date(g.created_at).toLocaleString() : 'Unknown date'}</div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">{g.white} — {g.black}</div>
                              <div className="mt-2 text-xs whitespace-pre-wrap bg-surface p-2 rounded">{(parsePGNTags(g.pgn).result) || '-'}</div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

 

