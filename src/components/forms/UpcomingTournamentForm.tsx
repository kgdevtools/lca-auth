"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Upload, X, Plus, Trash2 } from "lucide-react"
import { createUpcomingTournament } from "@/repositories/upcomingTournamentRepo"
import type { CreateUpcomingTournamentPayload, TournamentSection } from "@/types/upcoming-tournament"

export function UpcomingTournamentForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = React.useState<CreateUpcomingTournamentPayload>({
    tournament_name: "",
    tournament_date: "",
    location: "",
    organizer_name: "",
    organizer_contact: "",
    registration_form_link: "",
    poster_url: "",
    poster_public_id: "",
    sections: [{ title: "", content: "" }],
    description: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [posterFile, setPosterFile] = React.useState<File | null>(null)
  const [posterPreview, setPosterPreview] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    let isValid = true

    // Validate required fields
    const fieldsToValidate = [
      'tournament_name',
      'tournament_date',
      'location',
      'organizer_name',
      'organizer_contact',
      'registration_form_link'
    ] as const

    for (const field of fieldsToValidate) {
      const error = validateField(field, form[field] as string)
      if (error) {
        errors[field] = error
        isValid = false
      }
    }

    setFieldErrors(errors)
    return isValid
  }

  function update<K extends keyof CreateUpcomingTournamentPayload>(key: K, value: CreateUpcomingTournamentPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    // Clear field error when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors((errors) => {
        const newErrors = { ...errors }
        delete newErrors[key as string]
        return newErrors
      })
    }
  }

  function validateField(name: string, value: string): string | null {
    switch (name) {
      case 'tournament_name':
        if (!value.trim()) return 'Tournament name is required'
        if (value.length > 30) return 'Tournament name must be 30 characters or less'
        return null
      case 'organizer_contact':
        if (!value.trim()) return 'Contact number is required'
        if (!/^[0-9]{10}$/.test(value)) return 'Please enter a valid 10-digit South African phone number'
        return null
      case 'location':
        if (!value.trim()) return 'Location is required'
        return null
      case 'organizer_name':
        if (!value.trim()) return 'Organizer name is required'
        return null
      case 'registration_form_link':
        if (!value.trim()) return 'Registration form link is required'
        if (!/^https?:\/\/.+/.test(value)) return 'Please enter a valid URL starting with http:// or https://'
        return null
      case 'tournament_date':
        if (!value) return 'Tournament date is required'
        const date = new Date(value)
        const now = new Date()
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        if (date < now) return 'Tournament date cannot be in the past'
        if (date > oneYearFromNow) return 'Tournament date cannot be more than one year from now'
        return null
      default:
        return null
    }
  }

  function addSection() {
    setForm((f) => ({
      ...f,
      sections: [...(f.sections || []), { title: "", content: "" }]
    }))
  }

  function removeSection(index: number) {
    setForm((f) => ({
      ...f,
      sections: f.sections?.filter((_, i) => i !== index) || []
    }))
  }

  function updateSection(index: number, field: keyof TournamentSection, value: string) {
    setForm((f) => {
      const newSections = [...(f.sections || [])]
      newSections[index] = { ...newSections[index], [field]: value }
      return { ...f, sections: newSections }
    })
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, or WebP)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
    setError(null)

    // For now, just simulate upload - in production you'd upload to Cloudinary/S3
    // This is a placeholder - you'll need to implement actual image upload
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/upload-poster', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const result = await response.json()
        update('poster_url', result.url)
        update('poster_public_id', result.publicId)
      } else {
        setError('Failed to upload poster')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload poster')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate form
    if (!validateForm()) {
      setError('Please correct the errors below')
      return
    }

    setSubmitting(true)

    try {
      const result = await createUpcomingTournament(form)
      
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Failed to create tournament')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Form submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
            {error}
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tournament Name *
            </label>
              <input
                required
                maxLength={30}
                className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                  fieldErrors.tournament_name ? 'border-destructive' : 'border-input'
                }`}
                value={form.tournament_name}
                onChange={(e) => update("tournament_name", e.target.value)}
                placeholder="e.g., Seshego New Year Rapid"
              />
              {fieldErrors.tournament_name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.tournament_name}</p>
              )}
          </div>

          {/* Tournament Date & Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Tournament Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.tournament_date ? 'border-destructive' : 'border-input'
              }`}
              value={form.tournament_date}
              onChange={(e) => update("tournament_date", e.target.value)}
            />
            {fieldErrors.tournament_date && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.tournament_date}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Location *
            </label>
            <input
              required
              className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.location ? 'border-destructive' : 'border-input'
              }`}
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g., Seshego Community Hall"
            />
            {fieldErrors.location && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.location}</p>
            )}
          </div>

          {/* Organizer Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Organizer Name *
            </label>
            <input
              required
              className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.organizer_name ? 'border-destructive' : 'border-input'
              }`}
              value={form.organizer_name}
              onChange={(e) => update("organizer_name", e.target.value)}
              placeholder="e.g., Limpopo Chess Academy"
            />
            {fieldErrors.organizer_name && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.organizer_name}</p>
            )}
          </div>

          {/* Organizer Contact */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Organizer Contact *
            </label>
            <input
              required
              maxLength={10}
              placeholder="076 123 4567"
              className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.organizer_contact ? 'border-destructive' : 'border-input'
              }`}
              value={form.organizer_contact}
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, '')
                update("organizer_contact", value)
              }}
            />
            {fieldErrors.organizer_contact && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.organizer_contact}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Enter 10-digit South African phone number (no spaces)</p>
          </div>

          {/* Registration Form Link */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Registration Form Link *
            </label>
            <input
              type="url"
              required
              placeholder="https://forms.app/your-tournament-form"
              className={`w-full rounded-sm border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
                fieldErrors.registration_form_link ? 'border-destructive' : 'border-input'
              }`}
              value={form.registration_form_link}
              onChange={(e) => update("registration_form_link", e.target.value)}
            />
            {fieldErrors.registration_form_link && (
              <p className="text-xs text-destructive mt-1">{fieldErrors.registration_form_link}</p>
            )}
          </div>
        </div>

        {/* Tournament Poster */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Tournament Poster *
          </label>
          <div className="space-y-3">
            {posterPreview ? (
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border">
                <img
                  src={posterPreview}
                  alt="Poster preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPosterFile(null)
                    setPosterPreview(null)
                    update('poster_url', '')
                    update('poster_public_id', '')
                  }}
                  className="absolute top-2 right-2 p-2 bg-background/80 rounded-full border border-border hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload poster</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                  required
                />
              </label>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Tournament description (optional)"
          />
        </div>

        {/* Dynamic Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-foreground">
              Tournament Details
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSection}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Detail
            </Button>
          </div>
          
          <div className="space-y-3">
            {form.sections?.map((section, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="e.g., Entry Fee"
                    className="rounded-sm border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={section.title}
                    onChange={(e) => updateSection(index, "title", e.target.value)}
                    maxLength={50}
                  />
                  <input
                    placeholder="e.g., R50"
                    className="rounded-sm border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={section.content}
                    onChange={(e) => updateSection(index, "content", e.target.value)}
                    maxLength={100}
                  />
                </div>
                {form.sections!.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSection(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Creating Tournament..." : "Create Tournament"}
          </Button>
        </div>
      </form>
    </div>
  )
}