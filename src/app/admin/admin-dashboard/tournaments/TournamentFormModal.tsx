// src/app/admin/admin-dashboard/tournaments/TournamentFormModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Users, Trophy, Clock } from 'lucide-react'
import { createTournament, updateTournament } from '../server-actions'

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

export default function TournamentFormModal({ 
  isOpen, 
  onClose, 
  tournament, 
  onSuccess 
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
    source: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = Boolean(tournament?.id)

  // Reset form when modal opens/closes or tournament changes
  useEffect(() => {
    if (isOpen) {
      if (tournament) {
        setFormData({
          ...tournament,
          date: tournament.date ? formatDateForInput(tournament.date) : ''
        })
      } else {
        setFormData({
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
          source: ''
        })
      }
      setErrors({})
    }
  }, [isOpen, tournament])

  const formatDateForInput = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toISOString().split('T')[0]
    } catch {
      return dateStr
    }
  }

  const handleInputChange = (field: keyof Tournament, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.tournament_name?.trim()) {
      newErrors.tournament_name = 'Tournament name is required'
    }

    if (!formData.location?.trim()) {
      newErrors.location = 'Location is required'
    }

    if (!formData.date?.trim()) {
      newErrors.date = 'Date is required'
    }

    if (formData.rounds !== null && formData.rounds !== undefined && formData.rounds < 1) {
      newErrors.rounds = 'Rounds must be at least 1'
    }

    if (formData.average_elo !== null && formData.average_elo !== undefined && formData.average_elo < 0) {
      newErrors.average_elo = 'Average ELO must be positive'
    }

    if (formData.average_age !== null && formData.average_age !== undefined && formData.average_age < 0) {
      newErrors.average_age = 'Average age must be positive'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const submissionData = {
        ...formData,
        rounds: formData.rounds === null ? null : Number(formData.rounds),
average_elo: formData.average_elo === null ? null : Number(formData.average_elo),
average_age: formData.average_age === null ? null : Number(formData.average_age),
      }

      let result
      if (isEdit && tournament?.id) {
        result = await updateTournament(tournament.id, submissionData)
      } else {
        result = await createTournament(submissionData)
      }

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert(`Error ${isEdit ? 'updating' : 'creating'} tournament: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} tournament:`, error)
      alert(`Error ${isEdit ? 'updating' : 'creating'} tournament`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Tournament' : 'Create Tournament'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={formData.tournament_name || ''}
                  onChange={(e) => handleInputChange('tournament_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tournament_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter tournament name"
                />
                {errors.tournament_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.tournament_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Type
                </label>
                <select
                  value={formData.tournament_type || ''}
                  onChange={(e) => handleInputChange('tournament_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  <option value="Swiss">Swiss</option>
                  <option value="Round Robin">Round Robin</option>
                  <option value="Knockout">Knockout</option>
                  <option value="Arena">Arena</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location *
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter location"
                />
                {errors.location && (
                  <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tournament Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Tournament Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizer
                </label>
                <input
                  type="text"
                  value={formData.organizer || ''}
                  onChange={(e) => handleInputChange('organizer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter organizer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Federation
                </label>
                <input
                  type="text"
                  value={formData.federation || ''}
                  onChange={(e) => handleInputChange('federation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter federation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.rounds || ''}
                  onChange={(e) => handleInputChange('rounds', e.target.value ? parseInt(e.target.value) : null)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.rounds ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Number of rounds"
                />
                {errors.rounds && (
                  <p className="text-red-500 text-xs mt-1">{errors.rounds}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating Calculation
                </label>
                <select
                  value={formData.rating_calculation || ''}
                  onChange={(e) => handleInputChange('rating_calculation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select calculation method</option>
                  <option value="ELO">ELO</option>
                  <option value="FIDE">FIDE</option>
                  <option value="USCF">USCF</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Officials */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tournament Officials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Director
                </label>
                <input
                  type="text"
                  value={formData.tournament_director || ''}
                  onChange={(e) => handleInputChange('tournament_director', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tournament director"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Arbiter
                </label>
                <input
                  type="text"
                  value={formData.chief_arbiter || ''}
                  onChange={(e) => handleInputChange('chief_arbiter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter chief arbiter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deputy Chief Arbiter
                </label>
                <input
                  type="text"
                  value={formData.deputy_chief_arbiter || ''}
                  onChange={(e) => handleInputChange('deputy_chief_arbiter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter deputy chief arbiter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arbiter
                </label>
                <input
                  type="text"
                  value={formData.arbiter || ''}
                  onChange={(e) => handleInputChange('arbiter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter arbiter"
                />
              </div>
            </div>
          </div>

          {/* Time Control & Statistics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Control & Statistics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Control
                </label>
                <input
                  type="text"
                  value={formData.time_control || ''}
                  onChange={(e) => handleInputChange('time_control', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 90+30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate of Play
                </label>
                <select
                  value={formData.rate_of_play || ''}
                  onChange={(e) => handleInputChange('rate_of_play', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select rate</option>
                  <option value="Rapid">Rapid</option>
                  <option value="Blitz">Blitz</option>
                  <option value="Classical">Classical</option>
                  <option value="Bullet">Bullet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average ELO
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.average_elo || ''}
                  onChange={(e) => handleInputChange('average_elo', e.target.value ? parseInt(e.target.value) : null)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.average_elo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter average rating"
                />
                {errors.average_elo && (
                  <p className="text-red-500 text-xs mt-1">{errors.average_elo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Age
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.average_age || ''}
                  onChange={(e) => handleInputChange('average_age', e.target.value ? parseInt(e.target.value) : null)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.average_age ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter average age"
                />
                {errors.average_age && (
                  <p className="text-red-500 text-xs mt-1">{errors.average_age}</p>
                )}
              </div>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <input
              type="text"
              value={formData.source || ''}
              onChange={(e) => handleInputChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter data source (optional)"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEdit ? 'Update Tournament' : 'Create Tournament'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
