"use client"

import React, { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OnboardingModal } from '@/components/user/OnboardingModal'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import { Loader2, Check, User, Mail, Calendar, Trophy, Target, Clock, TrendingUp } from 'lucide-react'
import type { ProfilePageData } from './actions'
import { updateProfile, needsOnboarding } from './actions'
import type { PlayerSearchResult, ActivePlayerData } from './tournament-actions'
import { getActivePlayerData, getPlayerStatistics } from './tournament-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface Props extends ProfilePageData {}

export default function ProfileView({
  user,
  profile,
  profileError,
  activePlayerData,
  playerStats,
  matchResult,
  signOutAction
}: Props) {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Check if onboarding is needed
  useEffect(() => {
    async function checkOnboarding() {
      const needs = await needsOnboarding()
      setShowOnboarding(needs)
      setOnboardingChecked(true)
    }
    checkOnboarding()
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    router.refresh()
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'

  // State for "Is this you?" functionality
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null)
  const [updatedPlayerData, setUpdatedPlayerData] = useState<ActivePlayerData[]>(activePlayerData)
  const [updatedPlayerStats, setUpdatedPlayerStats] = useState(playerStats)
  const [confirmedMatches, setConfirmedMatches] = useState<Set<string>>(new Set())
  const chessaIdRef = React.useRef<HTMLInputElement>(null)

  // Update local state when props change
  useEffect(() => {
    setUpdatedPlayerData(activePlayerData)
    setUpdatedPlayerStats(playerStats)
  }, [activePlayerData, playerStats])

  const handleSelectPlayer = async (playerName: string, uniqueNo: string) => {
    setLoadingPlayer(playerName)

    try {
      const newPlayerData = await getActivePlayerData(playerName)
      const newPlayerStats = await getPlayerStatistics(playerName)

      if (newPlayerData && newPlayerStats && updatedPlayerStats) {
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

        setUpdatedPlayerData(combinedTournaments)
        setUpdatedPlayerStats(combinedStats)
        setSelectedPlayer(playerName)
        setConfirmedMatches(prev => new Set(prev).add(playerName))

        if (uniqueNo && chessaIdRef.current) {
          chessaIdRef.current.value = uniqueNo
          const event = new Event('input', { bubbles: true })
          chessaIdRef.current.dispatchEvent(event)
        }
      }
    } catch (error) {
      // Error handled silently - user can retry
    } finally {
      setLoadingPlayer(null)
    }
  }

  if (!onboardingChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <OnboardingModal 
        open={showOnboarding} 
        userEmail={user.email || ''} 
        onComplete={handleOnboardingComplete}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Personalized Welcome Header */}
        <div className="mb-10">
          <div className="mb-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {profile?.full_name || profile?.tournament_fullname || 'there'}
              </span>
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 tracking-tight">
            Here's your profile overview and tournament performance
          </p>
        </div>

        {profileError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileError}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar
                    name={profile?.full_name || profile?.tournament_fullname || user.email || 'User'}
                    size={100}
                    className="mb-2"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {profile?.full_name || profile?.tournament_fullname || 'User'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
                    <Badge className="mt-3" variant="outline">
                      {profile?.role || 'Student'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </div>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <User className="w-3.5 h-3.5" />
                    Display Name
                  </div>
                  <p className="text-sm font-medium">{profile?.full_name || '—'}</p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <PlayerSearchRow
                    label="Tournament Name"
                    name="tournament_fullname"
                    defaultValue={profile?.tournament_fullname ?? ''}
                    updateAction={updateProfile}
                    chessaIdRef={chessaIdRef}
                  />
                </div>

                <div className="border-t pt-4 space-y-3">
                  <EditableRow
                    label="Chess SA ID"
                    name="chessa_id"
                    defaultValue={profile?.chessa_id ?? ''}
                    updateAction={updateProfile}
                    ref={chessaIdRef}
                  />
                </div>

                <div className="border-t pt-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Calendar className="w-3.5 h-3.5" />
                    Member Since
                  </div>
                  <p className="text-sm font-medium">{memberSince}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats and Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Statistics */}
            {updatedPlayerStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Player Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Target className="w-3.5 h-3.5" />
                        Total Games
                      </div>
                      <p className="text-3xl font-bold">{updatedPlayerStats.totalGames}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Trophy className="w-3.5 h-3.5" />
                        Tournaments
                      </div>
                      <p className="text-3xl font-bold">{updatedPlayerStats.tournaments}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Current Rating
                      </div>
                      <p className="text-3xl font-bold">{updatedPlayerStats.latestRating}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Trophy className="w-3.5 h-3.5" />
                        Highest Rating
                      </div>
                      <p className="text-3xl font-bold">{updatedPlayerStats.highestRating}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Avg Performance
                      </div>
                      <p className="text-3xl font-bold">
                        {typeof updatedPlayerStats.avgPerformance === 'number'
                          ? updatedPlayerStats.avgPerformance.toFixed(1)
                          : updatedPlayerStats.avgPerformance}
                      </p>
                    </div>
                    {updatedPlayerStats.federation && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <User className="w-3.5 h-3.5" />
                          Federation
                        </div>
                        <p className="text-2xl font-bold">{updatedPlayerStats.federation}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Tournaments */}
            {updatedPlayerData && updatedPlayerData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Recent Tournaments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {updatedPlayerData.slice(0, 6).map((tournament, idx) => (
                      <div key={idx} className="border rounded-sm p-4 space-y-2 hover:bg-accent/50 transition-colors">
                        <p className="font-semibold text-sm line-clamp-2">
                          {tournament.tournament_name || 'Unknown Tournament'}
                        </p>
                        <div className="space-y-1 text-xs text-muted-foreground">
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
            )}

            {/* No Data Message */}
            {profile?.tournament_fullname && (!activePlayerData || activePlayerData.length === 0) && !playerStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Tournament Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No tournament data found for "<span className="font-semibold">{profile.tournament_fullname}</span>" in the active players database.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function PlayerSearchRow({
  label,
  name,
  defaultValue,
  updateAction,
  chessaIdRef
}: {
  label: string
  name: string
  defaultValue: string
  updateAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>
  chessaIdRef: React.RefObject<HTMLInputElement | null>
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUniqueNo, setSelectedUniqueNo] = useState<string | null>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set('chessa_id', selectedUniqueNo)
    }

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
        window.location.reload()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setValue(player.name)
    if (player.unique_no) {
      setSelectedUniqueNo(player.unique_no)
      if (chessaIdRef.current) {
        chessaIdRef.current.value = player.unique_no
        const event = new Event('input', { bubbles: true })
        chessaIdRef.current.dispatchEvent(event)
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </Button>
        )}
      </div>
      <div>
        {!editing ? (
          <p className="text-sm font-medium">{value || '—'}</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <PlayerSearchCombobox
                value={value}
                onValueChange={setValue}
                onPlayerSelect={handlePlayerSelect}
                placeholder="Search for a player..."
                className="w-full"
              />
              <input type="hidden" name={name} value={value} />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setValue(defaultValue)
                    setError(null)
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const EditableRow = React.forwardRef<HTMLInputElement, {
  label: string
  name: string
  defaultValue: string
  updateAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}>(({
  label,
  name,
  defaultValue,
  updateAction
}, ref) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </Button>
        )}
      </div>
      <div>
        {!editing ? (
          <p className="text-sm font-medium font-mono">{value || '—'}</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                ref={ref}
                name={name}
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                className="font-mono"
                autoFocus
                disabled={isSubmitting}
                placeholder="Enter Chess SA ID"
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="sm"
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setValue(defaultValue)
                    setError(null)
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
})

EditableRow.displayName = "EditableRow"
