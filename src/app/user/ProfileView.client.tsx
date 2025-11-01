"use client"
import React from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import type { ProfilePageData } from './actions'
import { updateProfile } from './actions'
import type { PlayerSearchResult, ActivePlayerData } from './tournament-actions'

interface Props extends ProfilePageData {}

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-gradient-to-br from-purple-500 to-purple-700'
    case 'coach':
      return 'bg-gradient-to-br from-blue-500 to-blue-700'
    case 'student':
      return 'bg-gradient-to-br from-green-500 to-green-700'
    default:
      return 'bg-gradient-to-br from-gray-500 to-gray-700'
  }
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-3 w-56 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProfileView({
  user,
  profile,
  profileError,
  activePlayerData,
  playerStats,
  matchResult,
  signOutAction
}: Props) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown'

  const roleColor = profile?.role ? getRoleColor(profile.role) : getRoleColor('student')
  const chessaIdRef = React.useRef<HTMLInputElement>(null)

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8">
      <WarningBanner message="Still under development: Some services may not work." />
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 lg:mb-8">My Profile</h1>
        
        {profileError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileError}</p>
            </CardContent>
          </Card>
        )}

        {/* Two-column layout for desktop, single column for mobile */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Avatar & Role Card */}
            <Card className={`${roleColor} text-white border-0`}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <Avatar
                    name={profile?.full_name || profile?.tournament_fullname || user.email || 'User'}
                    size={80}
                  />
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold">
                      {profile?.full_name || profile?.tournament_fullname || 'User'}
                    </h2>
                    <p className="text-white/90 text-sm mt-1">{user.email}</p>
                    <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-white/20 text-xs sm:text-sm font-semibold uppercase tracking-wide">
                      {profile?.role || 'Student'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                    <p className="text-sm">{user.email}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Name</p>
                    <p className="text-sm">{profile?.full_name || '—'}</p>
                  </div>

                  <div className="border-t pt-4">
                    <PlayerSearchRow
                      label="Tournament Name"
                      name="tournament_fullname"
                      defaultValue={profile?.tournament_fullname ?? ''}
                      updateAction={updateProfile}
                      chessaIdRef={chessaIdRef}
                    />
                  </div>

                  <EditableRow
                    label="Chess SA ID"
                    name="chessa_id"
                    defaultValue={profile?.chessa_id ?? ''}
                    updateAction={updateProfile}
                    ref={chessaIdRef}
                  />

                  <div className="border-t pt-4 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Since</p>
                    <p className="text-sm">{memberSince}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User ID</p>
                    <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Stats and Matches */}
          <div className="space-y-6">

            {/* Match Results */}
            {profile?.tournament_fullname && (matchResult.exactMatch || matchResult.closeMatches.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Player Match Results</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Found in Chess SA active players database
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
                      <div className="flex flex-wrap gap-2">
                        {matchResult.closeMatches.map((match, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30"
                          >
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              {match.name}
                            </span>
                            {match.unique_no && (
                              <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-mono">
                                #{match.unique_no}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Player Statistics Card */}
            {playerStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Player Statistics</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Based on tournament performance data
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Games</p>
                      <p className="text-2xl sm:text-3xl font-bold">{playerStats.totalGames}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tournaments</p>
                      <p className="text-2xl sm:text-3xl font-bold">{playerStats.tournaments}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Rating</p>
                      <p className="text-2xl sm:text-3xl font-bold">{playerStats.latestRating}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Highest Rating</p>
                      <p className="text-2xl sm:text-3xl font-bold">{playerStats.highestRating}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Performance</p>
                      <p className="text-2xl sm:text-3xl font-bold">{playerStats.avgPerformance}</p>
                    </div>
                    {playerStats.federation && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Federation</p>
                        <p className="text-xl sm:text-2xl font-bold">{playerStats.federation}</p>
                      </div>
                    )}
                    {playerStats.chessaId && (
                      <div className="col-span-2 space-y-1 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chess SA ID</p>
                        <p className="text-lg font-mono font-bold">{playerStats.chessaId}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

        {/* Full Width Recent Tournaments Section */}
        {activePlayerData && activePlayerData.length > 0 && (
          <Card className="mt-6 lg:mt-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Recent Tournaments</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Latest performances from Chess SA database
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlayerData.slice(0, 12).map((tournament, idx) => (
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
        )}

        {/* Show message if no tournament data */}
        {profile?.tournament_fullname && (!activePlayerData || activePlayerData.length === 0) && !playerStats && (
          <Card className="mt-6 lg:mt-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Tournament Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No tournament data found for "<span className="font-semibold">{profile.tournament_fullname}</span>" in the active players database.
                Please ensure your tournament name matches exactly with Chess SA records.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
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
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedUniqueNo, setSelectedUniqueNo] = React.useState<string | null>(null)

  // Update local value when defaultValue changes (e.g., after form submission)
  React.useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Add chessa_id if we have it from player selection
    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set('chessa_id', selectedUniqueNo)
    }

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
        // Reload the page to fetch fresh data with the new tournament name
        window.location.reload()
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setValue(player.name)
    // Store the UNIQUE_NO for submission
    if (player.unique_no) {
      setSelectedUniqueNo(player.unique_no)
      // Auto-populate Chess SA ID if unique_no is available
      if (chessaIdRef.current) {
        chessaIdRef.current.value = player.unique_no
        // Trigger change event so React updates
        const event = new Event('input', { bubbles: true })
        chessaIdRef.current.dispatchEvent(event)
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {!editing && (
          <button
            className="text-xs text-primary underline"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <p className="text-sm">{value || '—'}</p>
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
              <input
                type="hidden"
                name={name}
                value={value}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setValue(defaultValue)
                    setError(null)
                  }}
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 border rounded-md hover:bg-accent whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Select a player from the dropdown to auto-fill Chess SA ID
              </p>
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
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Update local value when defaultValue changes
  React.useEffect(() => {
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
        // Optionally reload if needed, or just update local state
        // For chessa_id, we might not need to reload the whole page
      } else {
        setError(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {!editing && (
          <button
            className="text-xs text-primary underline"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <p className="text-sm font-mono">{value || '—'}</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={ref}
                name={name}
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                className="w-full border rounded-md px-3 py-2 bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
                disabled={isSubmitting}
                placeholder="Enter Chess SA ID"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setValue(defaultValue)
                    setError(null)
                  }}
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Cancel
                </button>
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
