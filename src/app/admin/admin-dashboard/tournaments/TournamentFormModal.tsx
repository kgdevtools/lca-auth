'use client'

import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Trophy, Clock, Save, X } from 'lucide-react'
import { createTournament, updateTournament } from '../server-actions'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Tournament {
  id?: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  tournament_director: string | null
  chief_arbiter: string | null
  deputy_chief_arbiter: string | null
  arbiter: string | null
  time_control: string | null
  rate_of_play: string | null
  location: string | null
  rounds: number | null
  tournament_type: string | null
  rating_calculation: string | null
  date: string | null
  average_elo: number | null
  average_age: number | null
  source: string | null
}

interface TournamentFormModalProps {
  isOpen: boolean
  onClose: () => void
  tournament?: Tournament | null
  onSuccess: () => void
}

const inputBase = "w-full h-9 px-3 rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
const inputError = "border-destructive focus:ring-destructive/20"
const labelClasses = "block text-xs font-medium text-muted-foreground mb-1"

export default function TournamentFormModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: TournamentFormModalProps) {
  const [formData, setFormData] = useState<Tournament>({
    tournament_name: '',
    organizer: '',
    federation: '',
    tournament_director: '',
    chief_arbiter: '',
    deputy_chief_arbiter: '',
    arbiter: '',
    time_control: '',
    rate_of_play: '',
    location: '',
    rounds: null,
    tournament_type: '',
    rating_calculation: '',
    date: '',
    average_elo: null,
    average_age: null,
    source: '',
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const isEdit = Boolean(tournament?.id)

  useEffect(() => {
    if (isOpen) {
      if (tournament) {
        setFormData({ ...tournament, date: tournament.date ? formatDateForInput(tournament.date) : '' })
      } else {
        setFormData({
          tournament_name: '', organizer: '', federation: '', tournament_director: '',
          chief_arbiter: '', deputy_chief_arbiter: '', arbiter: '', time_control: '',
          rate_of_play: '', location: '', rounds: null, tournament_type: '',
          rating_calculation: '', date: '', average_elo: null, average_age: null, source: '',
        })
      }
      setErrors({})
      setServerError(null)
    }
  }, [isOpen, tournament])

  function formatDateForInput(dateStr: string) {
    try { return new Date(dateStr).toISOString().split('T')[0] } catch { return dateStr }
  }

  function handleInputChange(field: keyof Tournament, value: string | number | null) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
    if (serverError) setServerError(null)
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}
    if (!formData.tournament_name?.trim()) newErrors.tournament_name = 'Tournament name is required'
    if (!formData.location?.trim())        newErrors.location         = 'Location is required'
    if (!formData.date?.trim())            newErrors.date             = 'Date is required'
    if (formData.rounds != null && formData.rounds < 1)             newErrors.rounds      = 'Must be at least 1'
    if (formData.average_elo != null && formData.average_elo < 0)   newErrors.average_elo = 'Must be positive'
    if (formData.average_age != null && formData.average_age < 0)   newErrors.average_age = 'Must be positive'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setServerError(null)
    try {
      const data = {
        ...formData,
        rounds:      formData.rounds      == null ? null : Number(formData.rounds),
        average_elo: formData.average_elo == null ? null : Number(formData.average_elo),
        average_age: formData.average_age == null ? null : Number(formData.average_age),
      }
      const result = isEdit && tournament?.id
        ? await updateTournament(tournament.id, data)
        : await createTournament(data)
      if (result.success) { onSuccess(); onClose() }
      else setServerError(result.error ?? 'An error occurred')
    } catch {
      setServerError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="sm:!max-w-3xl !p-0 !gap-0 !flex !flex-col !overflow-hidden"
      >
        {/* Sticky header */}
        <div className="shrink-0 flex items-start justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              {isEdit ? 'Edit Tournament' : 'Create Tournament'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update tournament information' : 'Add a new tournament to the system'}
            </DialogDescription>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <form
          id="tournament-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-6 space-y-5 bg-muted/20">

            {/* Basic Information */}
            <div className="bg-card rounded-sm border border-border p-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Tournament Name *</label>
                  <input
                    type="text"
                    value={formData.tournament_name || ''}
                    onChange={e => handleInputChange('tournament_name', e.target.value)}
                    className={`${inputBase} ${errors.tournament_name ? inputError : ''}`}
                    placeholder="Enter tournament name"
                  />
                  {errors.tournament_name && <p className="text-destructive text-xs mt-1">{errors.tournament_name}</p>}
                </div>

                <div>
                  <label className={labelClasses}>Tournament Type</label>
                  <select
                    value={formData.tournament_type || ''}
                    onChange={e => handleInputChange('tournament_type', e.target.value)}
                    className={inputBase}
                  >
                    <option value="">Select type</option>
                    <option value="Swiss">Swiss</option>
                    <option value="Round Robin">Round Robin</option>
                    <option value="Knockout">Knockout</option>
                    <option value="Arena">Arena</option>
                  </select>
                </div>

                <div>
                  <label className={`${labelClasses} flex items-center gap-1`}>
                    <MapPin className="w-3 h-3" />Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={e => handleInputChange('location', e.target.value)}
                    className={`${inputBase} ${errors.location ? inputError : ''}`}
                    placeholder="Enter location"
                  />
                  {errors.location && <p className="text-destructive text-xs mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className={`${labelClasses} flex items-center gap-1`}>
                    <Calendar className="w-3 h-3" />Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={e => handleInputChange('date', e.target.value)}
                    className={`${inputBase} ${errors.date ? inputError : ''}`}
                  />
                  {errors.date && <p className="text-destructive text-xs mt-1">{errors.date}</p>}
                </div>
              </div>
            </div>

            {/* Tournament Details */}
            <div className="bg-card rounded-sm border border-border p-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Tournament Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Organizer</label>
                  <input type="text" value={formData.organizer || ''} onChange={e => handleInputChange('organizer', e.target.value)} className={inputBase} placeholder="Enter organizer name" />
                </div>

                <div>
                  <label className={labelClasses}>Federation</label>
                  <input type="text" value={formData.federation || ''} onChange={e => handleInputChange('federation', e.target.value)} className={inputBase} placeholder="Enter federation" />
                </div>

                <div>
                  <label className={labelClasses}>Rounds</label>
                  <input
                    type="number" min="1"
                    value={formData.rounds || ''}
                    onChange={e => handleInputChange('rounds', e.target.value ? parseInt(e.target.value) : null)}
                    className={`${inputBase} ${errors.rounds ? inputError : ''}`}
                    placeholder="Number of rounds"
                  />
                  {errors.rounds && <p className="text-destructive text-xs mt-1">{errors.rounds}</p>}
                </div>

                <div>
                  <label className={labelClasses}>Rating Calculation</label>
                  <select value={formData.rating_calculation || ''} onChange={e => handleInputChange('rating_calculation', e.target.value)} className={inputBase}>
                    <option value="">Select method</option>
                    <option value="ELO">ELO</option>
                    <option value="FIDE">FIDE</option>
                    <option value="USCF">USCF</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tournament Officials */}
            <div className="bg-card rounded-sm border border-border p-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Tournament Officials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Tournament Director</label>
                  <input type="text" value={formData.tournament_director || ''} onChange={e => handleInputChange('tournament_director', e.target.value)} className={inputBase} placeholder="Enter tournament director" />
                </div>
                <div>
                  <label className={labelClasses}>Chief Arbiter</label>
                  <input type="text" value={formData.chief_arbiter || ''} onChange={e => handleInputChange('chief_arbiter', e.target.value)} className={inputBase} placeholder="Enter chief arbiter" />
                </div>
                <div>
                  <label className={labelClasses}>Deputy Chief Arbiter</label>
                  <input type="text" value={formData.deputy_chief_arbiter || ''} onChange={e => handleInputChange('deputy_chief_arbiter', e.target.value)} className={inputBase} placeholder="Enter deputy chief arbiter" />
                </div>
                <div>
                  <label className={labelClasses}>Arbiter</label>
                  <input type="text" value={formData.arbiter || ''} onChange={e => handleInputChange('arbiter', e.target.value)} className={inputBase} placeholder="Enter arbiter" />
                </div>
              </div>
            </div>

            {/* Time Control & Statistics */}
            <div className="bg-card rounded-sm border border-border p-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Time Control &amp; Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Time Control</label>
                  <input type="text" value={formData.time_control || ''} onChange={e => handleInputChange('time_control', e.target.value)} className={inputBase} placeholder="e.g., 90+30" />
                </div>

                <div>
                  <label className={labelClasses}>Rate of Play</label>
                  <select value={formData.rate_of_play || ''} onChange={e => handleInputChange('rate_of_play', e.target.value)} className={inputBase}>
                    <option value="">Select rate</option>
                    <option value="Rapid">Rapid</option>
                    <option value="Blitz">Blitz</option>
                    <option value="Classical">Classical</option>
                    <option value="Bullet">Bullet</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Average ELO</label>
                  <input
                    type="number" min="0"
                    value={formData.average_elo || ''}
                    onChange={e => handleInputChange('average_elo', e.target.value ? parseInt(e.target.value) : null)}
                    className={`${inputBase} ${errors.average_elo ? inputError : ''}`}
                    placeholder="Enter average rating"
                  />
                  {errors.average_elo && <p className="text-destructive text-xs mt-1">{errors.average_elo}</p>}
                </div>

                <div>
                  <label className={labelClasses}>Average Age</label>
                  <input
                    type="number" min="0"
                    value={formData.average_age || ''}
                    onChange={e => handleInputChange('average_age', e.target.value ? parseInt(e.target.value) : null)}
                    className={`${inputBase} ${errors.average_age ? inputError : ''}`}
                    placeholder="Enter average age"
                  />
                  {errors.average_age && <p className="text-destructive text-xs mt-1">{errors.average_age}</p>}
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="bg-card rounded-sm border border-border p-5">
              <label className={labelClasses}>Source</label>
              <input type="text" value={formData.source || ''} onChange={e => handleInputChange('source', e.target.value)} className={inputBase} placeholder="Enter data source (optional)" />
            </div>

          </div>
        </form>

        {/* Sticky footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-card">
          {serverError ? (
            <p className="text-destructive text-xs">{serverError}</p>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="tournament-form" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {isEdit ? 'Updating…' : 'Creating…'}
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  {isEdit ? 'Update Tournament' : 'Create Tournament'}
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
