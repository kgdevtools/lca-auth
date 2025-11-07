"use client"
import React from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { ProfilePageData } from '../actions'
import { updateProfile } from '../actions'
import type { PlayerSearchResult } from '../tournament-actions'
import { Pencil, Info } from 'lucide-react'

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

export default function ProfileEditView({
  user,
  profile,
  profileError,
}: Props) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown'

  const roleColor = profile?.role ? getRoleColor(profile.role) : getRoleColor('student')
  const chessaIdRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <WarningBanner message="Still under development: Some services may not work." />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile information and preferences</p>
      </div>

      {profileError && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{profileError}</p>
          </CardContent>
        </Card>
      )}

      {/* Avatar & Role Card */}
      <Card className={`${roleColor} text-white border-0 mb-6`}>
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

      {/* Profile Information Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Basic Information</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Your account details (read-only)</p>
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

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Since</p>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Chess SA Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Chess SA Settings</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Link your profile to Chess SA active players database</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <PlayerSearchRow
              label="Tournament Name"
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
          </div>
        </CardContent>
      </Card>
    </div>
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
  const [success, setSuccess] = React.useState(false)

  // Update local value when defaultValue changes
  React.useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)

    // Add chessa_id if we have it from player selection
    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set('chessa_id', selectedUniqueNo)
    }

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
        setSuccess(true)
        // Reload to fetch fresh data
        setTimeout(() => window.location.reload(), 1000)
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
      // Auto-populate Chess SA ID
      if (chessaIdRef.current) {
        chessaIdRef.current.value = player.unique_no
        const event = new Event('input', { bubbles: true })
        chessaIdRef.current.dispatchEvent(event)
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex text-muted-foreground hover:text-foreground transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs leading-relaxed">
                This is linked to your tournament records in the Chess SA database. Editing this will affect your player statistics and profile data. Final approval is pending admin review.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        {!editing && (
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <div className="space-y-2">
            <p className="text-sm">{value || '—'}</p>
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">✓ Updated successfully</p>
            )}
          </div>
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
  const [success, setSuccess] = React.useState(false)

  // Update local value when defaultValue changes
  React.useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await updateAction(formData)
      if (result.success) {
        setEditing(false)
        setSuccess(true)
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
            className="text-xs text-primary underline hover:text-primary/80"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <div className="space-y-2">
            <p className="text-sm font-mono">{value || '—'}</p>
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">✓ Updated successfully</p>
            )}
          </div>
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
