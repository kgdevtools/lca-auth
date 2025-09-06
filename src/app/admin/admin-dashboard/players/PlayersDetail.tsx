// src/app/admin/admin-dashboard/players/PlayerDetails.tsx
'use client'

import { useEffect, useState } from 'react'
import { getPlayerTournamentsData } from '../server-actions'

interface PlayerDetailsProps {
  playerId: number
}

interface TournamentAppearance {
  id: number
  name: string
  tournament_id: string
  tournament_points: number | null
  tournament_rating: number | null
  tournament_rank: number | null
  tie_breaks: any | null
  rounds: any | null
  tournament_name: string
  tournament_date: string | null
  tournament_location: string | null
}

export default function PlayerDetails({ playerId }: PlayerDetailsProps) {
  const [tournaments, setTournaments] = useState<TournamentAppearance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const result: {
        tournaments: any[]
        error?: string | null
      } = await getPlayerTournamentsData(playerId)

      const { tournaments, error } = result

      if (error) {
        setError(error)
      } else {
        const mapped: TournamentAppearance[] = tournaments.map((t) => ({
          id: t.id,
          name: t.name,
          tournament_id: t.tournament_id,
          tournament_points: t.points ?? null,
          tournament_rating: t.rating ?? null,
          tournament_rank: t.rank ?? null,
          tie_breaks: t.tie_breaks ?? null,
          rounds: t.rounds ?? null,
          tournament_name: t.tournament_name,
          tournament_date: t.tournament_date ?? null,
          tournament_location: t.tournament_location ?? null,
        }))
        setTournaments(mapped)
      }

      setLoading(false)
    }

    if (playerId) {
      fetchData()
    }
  }, [playerId])

  if (loading) {
    return <div className="p-4 text-gray-500">Loading player details...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  if (!tournaments || tournaments.length === 0) {
    return <div className="p-4 text-gray-500">No tournament history found.</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Tournament History</h2>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Tournament</th>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Location</th>
              <th className="p-2 border">Points</th>
              <th className="p-2 border">Rating</th>
              <th className="p-2 border">Rank</th>
              <th className="p-2 border">Tie Breaks</th>
              <th className="p-2 border">Rounds</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr key={t.id} className="text-center">
                <td className="p-2 border">{t.tournament_name}</td>
                <td className="p-2 border">{t.tournament_date || '—'}</td>
                <td className="p-2 border">{t.tournament_location || '—'}</td>
                <td className="p-2 border">{t.tournament_points ?? '—'}</td>
                <td className="p-2 border">{t.tournament_rating ?? '—'}</td>
                <td className="p-2 border">{t.tournament_rank ?? '—'}</td>
                <td className="p-2 border">
                  {t.tie_breaks ? JSON.stringify(t.tie_breaks) : '—'}
                </td>
                <td className="p-2 border">
                  {t.rounds ? JSON.stringify(t.rounds) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
