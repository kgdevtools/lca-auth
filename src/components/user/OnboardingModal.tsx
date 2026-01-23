'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlayerSearchCombobox } from '@/components/ui/player-search-combobox'
import { Loader2 } from 'lucide-react'
import { completeOnboarding } from '@/app/user/actions'
import type { PlayerSearchResult } from '@/app/user/tournament-actions'

interface OnboardingModalProps {
  open: boolean
  userEmail: string
  onComplete: () => void
}

export function OnboardingModal({ open, userEmail, onComplete }: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState('')
  const [tournamentFullName, setTournamentFullName] = useState('')
  const [chessaId, setChessaId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setTournamentFullName(player.name)
    if (player.unique_no) {
      setChessaId(player.unique_no)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!displayName.trim()) {
      setError('Display Name is required')
      return
    }

    if (!tournamentFullName.trim()) {
      setError('Tournament Full Name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('display_name', displayName.trim())
      formData.set('tournament_fullname', tournamentFullName.trim())
      if (chessaId.trim()) {
        formData.set('chessa_id', chessaId.trim())
      }

      const result = await completeOnboarding(formData)

      if (result.success) {
        onComplete()
      } else {
        setError(result.error || 'Failed to complete onboarding. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent size="wide" showCloseButton={false} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-base">
            Let's get to know you better. Fill in your details to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name" className="text-sm font-semibold">
              Display Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              required
              disabled={isSubmitting}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              This is how your name will appear across the platform
            </p>
          </div>

          {/* Tournament Full Name */}
          <div className="space-y-2">
            <Label htmlFor="tournament_fullname" className="text-sm font-semibold">
              Tournament Full Name <span className="text-destructive">*</span>
            </Label>
            <PlayerSearchCombobox
              value={tournamentFullName}
              onValueChange={setTournamentFullName}
              onPlayerSelect={handlePlayerSelect}
              placeholder="Search for your tournament name..."
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Search for your name as it appears in Chess SA tournament records
            </p>
          </div>

          {/* Chessa ID */}
          <div className="space-y-2">
            <Label htmlFor="chessa_id" className="text-sm font-semibold">
              Chess SA ID <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="chessa_id"
              name="chessa_id"
              value={chessaId}
              onChange={(e) => setChessaId(e.target.value)}
              placeholder="Enter your Chess SA ID"
              disabled={isSubmitting}
              className="h-11 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your unique Chess SA identification number (auto-filled if you select a player above)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] h-11 text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
