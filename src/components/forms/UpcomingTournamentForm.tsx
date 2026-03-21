"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, Trash2, ImageIcon } from "lucide-react"
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

  function validateField(name: string, value: string): string | null {
    switch (name) {
      case 'tournament_name':
        if (!value.trim()) return 'Required'
        if (value.length > 30) return 'Max 30 chars'
        return null
      case 'organizer_contact':
        if (!value.trim()) return 'Required'
        if (!/^[0-9]{10}$/.test(value)) return '10-digit SA number'
        return null
      case 'location':
        if (!value.trim()) return 'Required'
        return null
      case 'organizer_name':
        if (!value.trim()) return 'Required'
        return null
      case 'registration_form_link':
        if (!value.trim()) return 'Required'
        if (!/^https?:\/\/.+/.test(value)) return 'Valid URL needed'
        return null
      case 'tournament_date':
        if (!value) return 'Required'
        const date = new Date(value)
        const now = new Date()
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        if (date < now) return 'Cannot be past'
        if (date > oneYearFromNow) return 'Max 1 year'
        return null
      default:
        return null
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    let isValid = true

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
    if (fieldErrors[key]) {
      setFieldErrors((errors) => {
        const newErrors = { ...errors }
        delete newErrors[key as string]
        return newErrors
      })
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

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Max file size is 5MB')
      return
    }

    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
    setError(null)

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
        setError('Failed to upload')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      setError('Please fix errors above')
      return
    }

    setSubmitting(true)

    try {
      const result = await createUpcomingTournament(form)
      
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'Failed to create')
      }
    } catch (err) {
      setError('Unexpected error')
      console.error('Submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field: string) => `
    w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground 
    placeholder:text-muted-foreground 
    focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary
    transition-colors duration-150
    ${fieldErrors[field] ? 'border-destructive' : ''}
  `

  return (
    <div className="rounded-xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/20">
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 lg:p-6 space-y-4">
        {error ? (
          <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1 font-[family-name:system-ui]">
              Tournament Name <span className="text-destructive">*</span>
            </label>
            <input
              maxLength={30}
              className={inputClass('tournament_name')}
              value={form.tournament_name}
              onChange={(e) => update("tournament_name", e.target.value)}
              placeholder="e.g., Seshego New Year Rapid"
            />
            {fieldErrors.tournament_name && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.tournament_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
              Date & Time <span className="text-destructive">*</span>
            </label>
            <input
              type="datetime-local"
              className={inputClass('tournament_date')}
              value={form.tournament_date}
              onChange={(e) => update("tournament_date", e.target.value)}
            />
            {fieldErrors.tournament_date && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.tournament_date}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
              Location <span className="text-destructive">*</span>
            </label>
            <input
              className={inputClass('location')}
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="Venue address"
            />
            {fieldErrors.location && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.location}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
              Organizer <span className="text-destructive">*</span>
            </label>
            <input
              className={inputClass('organizer_name')}
              value={form.organizer_name}
              onChange={(e) => update("organizer_name", e.target.value)}
              placeholder="Organizer name"
            />
            {fieldErrors.organizer_name && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.organizer_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
              Contact <span className="text-destructive">*</span>
            </label>
            <input
              maxLength={10}
              placeholder="0761234567"
              className={inputClass('organizer_contact')}
              value={form.organizer_contact}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                update("organizer_contact", value)
              }}
            />
            {fieldErrors.organizer_contact && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.organizer_contact}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
              Registration Link <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              placeholder="https://forms.app/..."
              className={inputClass('registration_form_link')}
              value={form.registration_form_link}
              onChange={(e) => update("registration_form_link", e.target.value)}
            />
            {fieldErrors.registration_form_link && (
              <p className="text-[10px] text-destructive mt-0.5 tracking-tight">{fieldErrors.registration_form_link}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
            Comments
          </label>
          <textarea
            rows={2}
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary resize-none transition-colors"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-tightest leading-tightest text-foreground mb-1">
            Poster
          </label>
          <div className="flex items-center gap-2">
            {posterPreview ? (
              <div className="relative w-12 h-12 rounded border border-border flex-shrink-0 overflow-hidden">
                <img src={posterPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPosterFile(null)
                    setPosterPreview(null)
                    update('poster_url', '')
                    update('poster_public_id', '')
                  }}
                  className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full border border-background hover:bg-destructive/90"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : null}
            
            <label className="flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30 hover:bg-muted/50">
              {posterPreview ? <ImageIcon className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
              <span className="text-xs text-muted-foreground">
                {posterPreview ? 'Change' : 'Upload'}
              </span>
              <input type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
            </label>
            <span className="text-[10px] text-muted-foreground">JPG, PNG (5MB)</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-tightest leading-tightest text-foreground">
              Details
            </label>
            <Button type="button" variant="outline" size="sm" onClick={addSection} className="h-6 text-[10px] px-2">
              <span className="mr-0.5">+</span>Add
            </Button>
          </div>
          
          <div className="space-y-1.5">
            {form.sections?.map((section, index) => (
              <div key={index} className="flex gap-1.5 items-start">
                <input
                  placeholder="Label"
                  className="flex-1 min-w-0 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors"
                  value={section.title}
                  onChange={(e) => updateSection(index, "title", e.target.value)}
                  maxLength={50}
                />
                <input
                  placeholder="Value"
                  className="w-20 sm:w-24 rounded border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors flex-shrink-0"
                  value={section.content}
                  onChange={(e) => updateSection(index, "content", e.target.value)}
                  maxLength={100}
                />
                {form.sections!.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSection(index)} className="p-1 h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <Button type="submit" disabled={submitting} className="w-full text-sm">
            {submitting ? "Creating..." : "Create Tournament"}
          </Button>
        </div>
      </form>
    </div>
  )
}
