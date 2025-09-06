// src/app/admin/admin-dashboard/players/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getPlayerDetails } from '../../server-actions'

interface TieBreakColumn {
  key: string
  label: string
}

interface TieBreakAnalysis {
  [key: string]: string
}

interface TournamentPerformance {
  performanceRating?: number
  totalPerformance: number
  tournamentCount: number
  averagePerformance: number
}

interface TournamentWithIssue {
  tournament_name: string
  tournament_date: string
  reason: string
}

export default function PlayerDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tieBreakColumns, setTieBreakColumns] = useState<TieBreakColumn[]>([])
  const [tieBreakAnalysis, setTieBreakAnalysis] = useState<TieBreakAnalysis>({})
  const [tournamentPerformance, setTournamentPerformance] = useState<TournamentPerformance>({
    totalPerformance: 0,
    tournamentCount: 0,
    averagePerformance: 0
  })
  const [tournamentsWithIssues, setTournamentsWithIssues] = useState<TournamentWithIssue[]>([])

  // Function to detect tie-break type
  const detectTieBreakType = (key: string, value: any, allValues: {[key: string]: any}): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    const isInteger = Number.isInteger(numValue)
    const allNumericValues = Object.values(allValues)
      .map(v => typeof v === 'string' ? parseFloat(v) : v)
      .filter(v => typeof v === 'number' && !isNaN(v))
      .sort((a, b) => b - a)

    // Direct Encounter (0, 1, 0.5)
    if ([0, 1, 0.5].includes(numValue) || value === '') {
      return 'Direct Encounter'
    }

    // Number of Wins (integer ≤ round count, usually 3-9)
    if (isInteger && numValue >= 0 && numValue <= 15) {
      return 'Number of Wins'
    }

    // Performance Rating or ARO (100-3500 range)
    if (typeof numValue === 'number' && numValue >= 100 && numValue <= 3500) {
      if (allNumericValues.length > 0 && numValue === allNumericValues[0]) {
        return 'Performance Rating'
      } else {
        return 'Average Rating of Opponents'
      }
    }

    // Buchholz/Sonneborn-Berger (decimal values)
    if (typeof numValue === 'number' && !isInteger && numValue > 0) {
      // Check if there are multiple decimal values to differentiate
      const decimalValues = allNumericValues.filter(v => !Number.isInteger(v))
      if (decimalValues.length >= 2) {
        const sortedDecimals = decimalValues.sort((a, b) => b - a)
        if (numValue === sortedDecimals[0]) {
          return 'Buchholz (Gamepoints)'
        } else {
          return 'Sonneborn-Berger'
        }
      }
      return 'Buchholz (Gamepoints)'
    }

    // Fallback - use key name
    return key
  }

  // Function to analyze all tie breaks for a tournament
  const analyzeTournamentTieBreaks = (tournament: any): {performance?: number, analysis: TieBreakAnalysis, hasPerformance: boolean} => {
    const analysis: TieBreakAnalysis = {}
    let performanceRating: number | undefined = undefined
    let hasPerformance = false

    if (!tournament.tie_breaks) {
      return { analysis, performance: undefined, hasPerformance: false }
    }

    try {
      let tieBreaks = tournament.tie_breaks
      
      // Parse if string
      if (typeof tieBreaks === 'string') {
        try {
          tieBreaks = JSON.parse(tieBreaks)
        } catch {
          // If not JSON, treat as single value
          tieBreaks = { TB1: tieBreaks }
        }
      }

      if (typeof tieBreaks === 'object' && tieBreaks !== null) {
        // First pass: collect all values
        const allValues = { ...tieBreaks }
        
        // Second pass: detect types
        Object.entries(tieBreaks).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            const type = detectTieBreakType(key, value, allValues)
            analysis[key] = type
            
            // Check if this is a performance rating
            if (type === 'Performance Rating') {
              const numValue = typeof value === 'string' ? parseFloat(value) : value
              if (typeof numValue === 'number' && !isNaN(numValue)) {
                performanceRating = numValue
                hasPerformance = true
              }
            }
          }
        })
      }
    } catch (error) {
      console.error('Error analyzing tie breaks:', error)
    }

    return { analysis, performance: performanceRating, hasPerformance }
  }

  useEffect(() => {
    async function fetchData() {
      if (!id) return
      const { player, tournaments } = await getPlayerDetails(Number(id))
      setPlayer(player)
      setTournaments(tournaments)
      
      // Extract all unique tie break keys for column headers
      const allTieBreakKeys: Set<string> = new Set()
      const allAnalyses: TieBreakAnalysis[] = []
      let totalPerformance = 0
      let performanceCount = 0
      const issues: TournamentWithIssue[] = []

      tournaments.forEach(t => {
        const { analysis, performance, hasPerformance } = analyzeTournamentTieBreaks(t)
        allAnalyses.push(analysis)
        
        if (performance !== undefined) {
          totalPerformance += performance
          performanceCount++
        }

        // Track tournaments without performance rating
        if (!hasPerformance) {
          issues.push({
            tournament_name: t.tournament_name || 'Unknown Tournament',
            tournament_date: t.tournament_date || '-',
            reason: t.tie_breaks ? 'No performance rating detected in tie breaks' : 'Missing tie break values'
          })
        }

        if (t.tie_breaks) {
          try {
            let tieBreaks = t.tie_breaks
            if (typeof tieBreaks === 'string') {
              try {
                tieBreaks = JSON.parse(tieBreaks)
              } catch {
                // If not JSON, treat as single value
                tieBreaks = { TB1: tieBreaks }
              }
            }
            if (typeof tieBreaks === 'object' && tieBreaks !== null) {
              Object.keys(tieBreaks).forEach(key => {
                allTieBreakKeys.add(key)
              })
            }
          } catch (error) {
            console.error('Error processing tie breaks:', error)
          }
        }
      })

      // Set tie break columns
      const uniqueTieBreakKeys = Array.from(allTieBreakKeys).sort()
      const columns: TieBreakColumn[] = uniqueTieBreakKeys.map(key => ({
        key,
        label: key
      }))
      
      setTieBreakColumns(columns)
      setTournamentsWithIssues(issues)
      
      // Set tournament performance stats
      setTournamentPerformance({
        performanceRating: performanceCount > 0 ? Math.round(totalPerformance / performanceCount) : undefined,
        totalPerformance,
        tournamentCount: tournaments.length,
        averagePerformance: performanceCount > 0 ? Math.round(totalPerformance / performanceCount) : 0
      })

      setLoading(false)
    }
    fetchData()
  }, [id])

  const getTieBreakValue = (tournament: any, key: string): string => {
    if (!tournament.tie_breaks) return '-'
    
    try {
      let tieBreaks = tournament.tie_breaks
      
      if (typeof tieBreaks === 'string') {
        try {
          tieBreaks = JSON.parse(tieBreaks)
        } catch {
          return tieBreaks
        }
      }
      
      if (typeof tieBreaks === 'object' && tieBreaks !== null) {
        const value = tieBreaks[key]
        return value !== undefined && value !== null ? String(value) : '-'
      }
      
      return '-'
    } catch (error) {
      console.error('Error getting tie break value:', error)
      return '-'
    }
  }

  if (loading) {
    return <div className="p-6">Loading player data...</div>
  }

  if (!player) {
    return (
      <div className="p-6">
        <p className="text-red-500">Player not found.</p>
        <button
          className="mt-4 px-4 py-2 border rounded"
          onClick={() => router.back()}
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{player.source_name}</h1>
      <p className="mb-2">Unique No: {player.unique_no || '-'}</p>
      <p className="mb-2">CF Rating: {player.cf_rating || '-'}</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Tournaments Played</h2>
      <div className="overflow-x-auto w-full">
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 border">Tournament</th>
              <th className="px-3 py-2 border">Date</th>
              <th className="px-3 py-2 border">Location</th>
              <th className="px-3 py-2 border">Points</th>
              <th className="px-3 py-2 border">Rating</th>
              <th className="px-3 py-2 border">Rank</th>
              {tieBreakColumns.map((column) => (
                <th key={column.key} className="px-3 py-2 border">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tournaments.length === 0 ? (
              <tr>
                <td colSpan={6 + tieBreakColumns.length} className="text-center py-4 text-gray-500">
                  No tournaments found.
                </td>
              </tr>
            ) : (
              tournaments.map((t, idx) => {
                const { analysis } = analyzeTournamentTieBreaks(t)
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border">{t.tournament_name || '-'}</td>
                    <td className="px-3 py-2 border">{t.tournament_date || '-'}</td>
                    <td className="px-3 py-2 border">{t.tournament_location || '-'}</td>
                    <td className="px-3 py-2 border">{t.points || '-'}</td>
                    <td className="px-3 py-2 border">{t.rating || '-'}</td>
                    <td className="px-3 py-2 border">{t.rank || '-'}</td>
                    {tieBreakColumns.map((column) => (
                      <td key={column.key} className="px-3 py-2 border">
                        <div className="text-xs">{getTieBreakValue(t, column.key)}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {analysis[column.key] || 'Unknown'}
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tournament Performance Section */}
      <div className="mt-8 w-full">
        <h2 className="text-xl font-semibold mb-4">Tournament Performance Analysis</h2>
        
        {tournamentPerformance.performanceRating ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="bg-white p-4 rounded shadow w-full">
              <h3 className="font-semibold text-lg mb-2">Performance Rating</h3>
              <p className="text-2xl font-bold text-blue-600">
                {tournamentPerformance.performanceRating}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Average across {tournamentPerformance.tournamentCount} tournaments
              </p>
            </div>
            
            <div className="bg-white p-4 rounded shadow w-full">
              <h3 className="font-semibold text-lg mb-2">Total Performance</h3>
              <p className="text-2xl font-bold text-green-600">
                {tournamentPerformance.totalPerformance}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Sum of all tournament performances
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 rounded p-4 w-full">
            <h3 className="font-semibold text-yellow-800 mb-2">No Discernable Tournament Performance</h3>
            <p className="text-yellow-700">
              No performance rating values were detected in the tie-break data. 
              This could be due to missing data or different tie-break formats.
            </p>
          </div>
        )}

        {/* Tournaments with Performance Rating Issues */}
        {tournamentsWithIssues.length > 0 && (
          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3">Tournaments Needing Performance Rating</h3>
            <div className="bg-red-50 border border-red-200 rounded p-4 w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-100">
                      <th className="px-3 py-2 text-left">Tournament</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Reason</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentsWithIssues.map((tournament, index) => (
                      <tr key={index} className="border-b border-red-200">
                        <td className="px-3 py-2">{tournament.tournament_name}</td>
                        <td className="px-3 py-2">{tournament.tournament_date}</td>
                        <td className="px-3 py-2 text-red-600">{tournament.reason}</td>
                        <td className="px-3 py-2">
                          <div className="flex space-x-2">
                            <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                              Calculate TP
                            </button>
                            <button className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                              Undo
                            </button>
                            <button className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                              Confirm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 w-full">
          <h3 className="font-semibold mb-3">Tie-Break Key Detection</h3>
          <div className="bg-white p-4 rounded shadow w-full">
            <p className="text-sm text-gray-600 mb-2">
              The system automatically detects tie-break types using advanced heuristics:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li><strong>Performance Rating</strong>: Integers 100-3500 (highest value)</li>
              <li><strong>Average Rating of Opponents</strong>: Integers 100-3500 (not highest)</li>
              <li><strong>Buchholz/Sonneborn-Berger</strong>: Decimal values</li>
              <li><strong>Direct Encounter</strong>: 0, 1, 0.5, or empty</li>
              <li><strong>Number of Wins</strong>: Small integers (0-15)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
