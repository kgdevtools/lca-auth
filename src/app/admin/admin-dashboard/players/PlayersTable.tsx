// src/app/admin/admin-dashboard/players/PlayersTable.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPlayersData } from '../server-actions'

interface Player {
  id: number
  tournament_player_name: string
  normalized_name: string | null
  unique_no: string | null
  cf_rating: number | null
}

export default function PlayersTable() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true)
      setError(null)
      try {
        const { players, error } = await getPlayersData()
        if (error) {
          setError(error)
        } else {
          const mapped: Player[] = players.map((p: any) => ({
            id: p.id,
            tournament_player_name: p.source_name, // map source_name → tournament_player_name
            normalized_name: p.normalized_name ?? null,
            unique_no: p.unique_no ?? null,
            cf_rating: p.cf_rating ?? null,
          }))
          setPlayers(mapped) // ✅ use mapped instead of raw players
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Players</h2>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : players.length === 0 ? (
        <p>No players found.</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Normalized</th>
              <th className="border p-2">Unique No</th>
              <th className="border p-2">CF Rating</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.id}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="border p-2">
                  <Link
                    href={`/admin/admin-dashboard/players/${player.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {player.tournament_player_name}
                  </Link>
                </td>
                <td className="border p-2">{player.normalized_name ?? '-'}</td>
                <td className="border p-2">{player.unique_no ?? '-'}</td>
                <td className="border p-2">{player.cf_rating ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
