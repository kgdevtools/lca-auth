"use client"
import React from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import type { ProfilePageData } from './actions'
import { updateProfile } from './actions'
import type { PlayerSearchResult } from './tournament-actions'

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

export default function ProfileView({ user, profile, profileError, tournamentData, signOutAction }: Props) {
  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown'

  const roleColor = profile?.role ? getRoleColor(profile.role) : getRoleColor('student')
  const chessaIdRef = React.useRef<HTMLInputElement>(null)

  // Calculate tournament statistics
  const tournamentStats = React.useMemo(() => {
    if (!tournamentData || tournamentData.length === 0) return null

    const uniqueTournaments = new Set(tournamentData.map(t => t.tournament_name)).size
    const latestRating = tournamentData[0]?.rating || 'N/A'
    const highestRating = Math.max(...tournamentData.map(t => parseInt(t.rating || '0') || 0))
    const averagePerformance = tournamentData.reduce((acc, t) => {
      const perf = parseInt(t.performance_rating || '0') || 0
      return acc + perf
    }, 0) / tournamentData.length

    return {
      totalGames: tournamentData.length,
      uniqueTournaments,
      latestRating,
      highestRating: highestRating > 0 ? highestRating : 'N/A',
      averagePerformance: averagePerformance > 0 ? Math.round(averagePerformance) : 'N/A'
    }
  }, [tournamentData])

  return (
    <main className="min-h-dvh p-6">
      <WarningBanner message="Still under development: Some services may not work." />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        {profileError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileError}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {/* Avatar & Role Card */}
          <Card className={`${roleColor} text-white border-0`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={profile?.full_name || profile?.tournament_fullname || user.email || 'User'} 
                  size={64} 
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {profile?.full_name || profile?.tournament_fullname || 'User'}
                  </h2>
                  <p className="text-white/90 text-sm">{user.email}</p>
                  <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-semibold uppercase">
                    {profile?.role || 'Student'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Full Name:</span>
                  <span>{profile?.full_name || '—'}</span>
                </div>
                
                <PlayerSearchRow
                  label="Tournament Full Name"
                  name="tournament_fullname"
                  defaultValue={profile?.tournament_fullname ?? ''}
                  updateAction={updateProfile}
                  chessaIdRef={chessaIdRef}
                />
                
                <EditableRow
                  label="Chess SA ID"
                  name="chessa_id"
                  defaultValue={profile?.chessa_id ?? ''}
                  updateAction={updateProfile}
                  ref={chessaIdRef}
                />
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Member Since:</span>
                  <span>{memberSince}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">User ID:</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournament Statistics Card - Only show if user has tournament data */}
          {tournamentStats && (
            <Card>
              <CardHeader>
                <CardTitle>Tournament Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Games</p>
                    <p className="text-2xl font-bold">{tournamentStats.totalGames}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tournaments</p>
                    <p className="text-2xl font-bold">{tournamentStats.uniqueTournaments}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Rating</p>
                    <p className="text-2xl font-bold">{tournamentStats.latestRating}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Highest Rating</p>
                    <p className="text-2xl font-bold">{tournamentStats.highestRating}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Performance</p>
                    <p className="text-2xl font-bold">{tournamentStats.averagePerformance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Tournaments - Only show if user has tournament data */}
          {tournamentData && tournamentData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tournamentData.slice(0, 5).map((tournament, idx) => (
                    <div key={idx} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{tournament.tournament_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Rating: {tournament.player_rating || 'N/A'} | 
                            Performance: {tournament.performance_rating || 'N/A'}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tournament.created_at}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sign Out */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Sign out
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
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
  updateAction: (formData: FormData) => Promise<void>
  chessaIdRef: React.RefObject<HTMLInputElement | null>
}) {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)

  async function handleSubmit(formData: FormData) {
    await updateAction(formData)
    setEditing(false)
  }

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    // Auto-populate Chess SA ID if unique_no is available
    if (player.unique_no && chessaIdRef.current) {
      chessaIdRef.current.value = player.unique_no
    }
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm items-center">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <span>{value || '—'}</span>
            <button
              className="text-xs text-primary underline ml-2"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit
            </button>
          </div>
        ) : (
          <form action={handleSubmit} className="flex gap-2 items-center w-full">
            <div className="flex-1 min-w-0">
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
            </div>
            <button 
              type="submit" 
              className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 whitespace-nowrap"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={() => { 
                setEditing(false)
                setValue(defaultValue) 
              }} 
              className="text-sm px-3 py-1 border rounded hover:bg-accent whitespace-nowrap"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const EditableRow = React.forwardRef<HTMLInputElement, { 
  label: string
  name: string
  defaultValue: string
  updateAction: (formData: FormData) => Promise<void>
}>(({ 
  label, 
  name, 
  defaultValue,
  updateAction 
}, ref) => {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)

  async function handleSubmit(formData: FormData) {
    await updateAction(formData)
    setEditing(false)
  }

  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm items-center">
      <span className="text-muted-foreground font-medium">{label}:</span>
      <div>
        {!editing ? (
          <div className="flex items-center gap-3">
            <span>{value || '—'}</span>
            <button
              className="text-xs text-primary underline ml-2"
              onClick={() => setEditing(true)}
              type="button"
            >
              Edit
            </button>
          </div>
        ) : (
          <form action={handleSubmit} className="flex gap-2 items-center">
            <input
              ref={ref}
              name={name}
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              className="border rounded px-2 py-1 bg-background"
              autoFocus
            />
            <button 
              type="submit" 
              className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Save
            </button>
            <button 
              type="button" 
              onClick={() => { 
                setEditing(false)
                setValue(defaultValue) 
              }} 
              className="text-sm px-3 py-1 border rounded hover:bg-accent"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
})

EditableRow.displayName = "EditableRow"