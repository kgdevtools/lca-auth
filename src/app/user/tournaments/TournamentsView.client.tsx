"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { Loader2, Check } from 'lucide-react'
import type { ProfilePageData } from '../actions'
import { getActivePlayerData, getPlayerStatistics } from '../tournament-actions'

interface Props extends ProfilePageData {}

export default function TournamentsView({
  user,
  profile,
  activePlayerData,
  playerStats,
  matchResult,
}: Props) {
  const playerName = profile?.full_name || profile?.tournament_fullname || 'Your'
  const displayName = playerName === 'Your' ? 'Your' : `${playerName}'s`

  // State for "Is this you?" functionality
  const [loadingPlayer, setLoadingPlayer] = React.useState<string | null>(null)
  const [updatedPlayerData, setUpdatedPlayerData] = React.useState(activePlayerData)
  const [updatedPlayerStats, setUpdatedPlayerStats] = React.useState(playerStats)
  const [confirmedMatches, setConfirmedMatches] = React.useState<Set<string>>(new Set())

  // Update local state when props change
  React.useEffect(() => {
    setUpdatedPlayerData(activePlayerData)
    setUpdatedPlayerStats(playerStats)
  }, [activePlayerData, playerStats])

  const handleSelectPlayer = async (playerName: string, uniqueNo: string) => {
    setLoadingPlayer(playerName)

    try {
      // Fetch new data for the selected player
      const newPlayerData = await getActivePlayerData(playerName)
      const newPlayerStats = await getPlayerStatistics(playerName)

      // Combine the data with existing data
      if (newPlayerData && newPlayerStats && updatedPlayerStats) {
        // Merge tournament data - remove duplicates
        const combinedTournaments = [...updatedPlayerData]
        newPlayerData.forEach(newTournament => {
          const exists = combinedTournaments.some(
            existing =>
              existing.tournament_name === newTournament.tournament_name &&
              existing.created_at === newTournament.created_at
          )
          if (!exists) {
            combinedTournaments.push(newTournament)
          }
        })

        // Combine player statistics
        const maxLatestRating = Math.max(
          typeof updatedPlayerStats.latestRating === 'number' ? updatedPlayerStats.latestRating : parseInt(updatedPlayerStats.latestRating) || 0,
          typeof newPlayerStats.latestRating === 'number' ? newPlayerStats.latestRating : parseInt(newPlayerStats.latestRating) || 0
        )
        const maxHighestRating = Math.max(
          typeof updatedPlayerStats.highestRating === 'number' ? updatedPlayerStats.highestRating : parseInt(String(updatedPlayerStats.highestRating)) || 0,
          typeof newPlayerStats.highestRating === 'number' ? newPlayerStats.highestRating : parseInt(String(newPlayerStats.highestRating)) || 0
        )
        const calculatedAvgPerformance = ((
          (typeof updatedPlayerStats.avgPerformance === 'number' ? updatedPlayerStats.avgPerformance : parseFloat(String(updatedPlayerStats.avgPerformance)) || 0) * updatedPlayerStats.tournaments
        ) + (
          (typeof newPlayerStats.avgPerformance === 'number' ? newPlayerStats.avgPerformance : parseFloat(String(newPlayerStats.avgPerformance)) || 0) * newPlayerStats.tournaments
        )) / (updatedPlayerStats.tournaments + newPlayerStats.tournaments)

        const combinedStats = {
          totalGames: updatedPlayerStats.totalGames + newPlayerStats.totalGames,
          tournaments: updatedPlayerStats.tournaments + newPlayerStats.tournaments,
          latestRating: String(maxLatestRating),
          highestRating: maxHighestRating,
          avgPerformance: calculatedAvgPerformance,
          federation: updatedPlayerStats.federation || newPlayerStats.federation,
          chessaId: uniqueNo || updatedPlayerStats.chessaId || newPlayerStats.chessaId
        }

        // Update local state with combined data
        setUpdatedPlayerData(combinedTournaments)
        setUpdatedPlayerStats(combinedStats)
        setConfirmedMatches(prev => new Set(prev).add(playerName))
      }
    } catch (error) {
      console.error('Error fetching player data:', error)
    } finally {
      setLoadingPlayer(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <WarningBanner message="Still under development: Some services may not work." />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {displayName} Tournaments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View {displayName === 'Your' ? 'your' : 'your'} tournament history and performance statistics
        </p>
      </div>

      {/* Match Results */}
      {profile?.tournament_fullname && matchResult && (matchResult.exactMatch || matchResult.closeMatches.length > 0) && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Additional Player Profiles</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              We found similar names in our tournament records - select any that belong to you to combine your statistics
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchResult.exactMatch && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Exact Match</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                    ✓ {matchResult.exactMatch}
                  </span>
                </div>
              </div>
            )}

            {matchResult.closeMatches.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Close Matches{!matchResult.exactMatch && ' (Similar Names)'}
                </p>
                <div className="space-y-2">
                  {matchResult.closeMatches.map((match, idx) => {
                    const isConfirmed = confirmedMatches.has(match.name)
                    const isLoading = loadingPlayer === match.name

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg transition-all ${
                          isConfirmed
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-blue-500/10 border border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-sm font-medium truncate ${
                            isConfirmed
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-blue-700 dark:text-blue-400'
                          }`}>
                            {match.name}
                          </span>
                          {match.unique_no && (
                            <span className={`text-xs font-mono flex-shrink-0 ${
                              isConfirmed
                                ? 'text-green-600/70 dark:text-green-400/70'
                                : 'text-blue-600/70 dark:text-blue-400/70'
                            }`}>
                              #{match.unique_no}
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-semibold flex-shrink-0">
                              <Check className="w-3 h-3" />
                              Confirmed
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectPlayer(match.name, match.unique_no || '')}
                          disabled={isLoading || isConfirmed}
                          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isConfirmed
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading...
                            </span>
                          ) : isConfirmed ? (
                            'Yes'
                          ) : (
                            'Is this you?'
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Statistics Card */}
      {updatedPlayerStats && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Player Statistics</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Based on tournament performance data
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Games</p>
                <p className="text-2xl sm:text-3xl font-bold">{updatedPlayerStats.totalGames}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tournaments</p>
                <p className="text-2xl sm:text-3xl font-bold">{updatedPlayerStats.tournaments}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Rating</p>
                <p className="text-2xl sm:text-3xl font-bold">{updatedPlayerStats.latestRating}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Highest Rating</p>
                <p className="text-2xl sm:text-3xl font-bold">{updatedPlayerStats.highestRating}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Performance</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {typeof updatedPlayerStats.avgPerformance === 'number'
                    ? updatedPlayerStats.avgPerformance.toFixed(1)
                    : updatedPlayerStats.avgPerformance}
                </p>
              </div>
              {updatedPlayerStats.federation && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Federation</p>
                  <p className="text-xl sm:text-2xl font-bold">{updatedPlayerStats.federation}</p>
                </div>
              )}
              {updatedPlayerStats.chessaId && (
                <div className="col-span-2 space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chess SA ID</p>
                  <p className="text-lg font-mono font-bold">{updatedPlayerStats.chessaId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tournaments Section */}
      {updatedPlayerData && updatedPlayerData.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Tournament History</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All your tournament performances from Chess SA database
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {updatedPlayerData.map((tournament, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
                  <p className="font-semibold text-sm sm:text-base line-clamp-2" title={tournament.tournament_name || 'Unknown Tournament'}>
                    {tournament.tournament_name || 'Unknown Tournament'}
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span className="font-medium">Rating:</span>
                      <span>{tournament.RATING || tournament.player_rating || 'N/A'}</span>
                    </div>
                    {tournament.performance_rating && (
                      <div className="flex justify-between">
                        <span className="font-medium">Performance:</span>
                        <span>{tournament.performance_rating}</span>
                      </div>
                    )}
                    {tournament.created_at && (
                      <div className="flex justify-between">
                        <span className="font-medium">Date:</span>
                        <span>{new Date(tournament.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">Tournament Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {profile?.tournament_fullname ? (
                <>
                  No tournament data found for "<span className="font-semibold">{profile.tournament_fullname}</span>" in the active players database.
                  Please ensure your tournament name matches exactly with Chess SA records.
                </>
              ) : (
                <>
                  Please set your tournament name in your <a href="/user/profile" className="text-primary underline">profile settings</a> to view your tournament history.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
