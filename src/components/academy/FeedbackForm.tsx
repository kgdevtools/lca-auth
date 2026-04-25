'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Star, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Lesson {
  id: string
  title: string
}

interface ExistingFeedback {
  id: string
  feedback_text: string
  rating: number | null
  lesson_id: string | null
}

interface FeedbackFormProps {
  coachId: string
  studentId: string
  studentName: string
  lessons: Lesson[]
  existingFeedback?: ExistingFeedback | null
  onSuccess?: () => void
  onCancel?: () => void
}

export default function FeedbackForm({
  coachId,
  studentId,
  studentName,
  lessons,
  existingFeedback,
  onSuccess,
  onCancel,
}: FeedbackFormProps) {
  const router     = useRouter()
  const isEditing  = !!existingFeedback

  const [text, setText]           = useState(existingFeedback?.feedback_text ?? '')
  const [rating, setRating]       = useState<number | null>(existingFeedback?.rating ?? null)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [lessonId, setLessonId]   = useState<string>(existingFeedback?.lesson_id ?? '')
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting]  = useState(false)

  const displayRating = hoverRating ?? rating

  const handleSubmit = () => {
    if (!text.trim()) { setError('Feedback text is required'); return }
    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      if (isEditing) {
        const { error: err } = await supabase
          .from('coach_feedback')
          .update({
            feedback_text: text.trim(),
            rating:        rating ?? null,
            lesson_id:     lessonId || null,
            updated_at:    new Date().toISOString(),
          })
          .eq('id', existingFeedback!.id)
          .eq('coach_id', coachId) // RLS double-check

        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await supabase
          .from('coach_feedback')
          .insert({
            coach_id:      coachId,
            student_id:    studentId,
            feedback_text: text.trim(),
            rating:        rating ?? null,
            lesson_id:     lessonId || null,
          })

        if (err) { setError(err.message); return }
      }

      router.refresh()
      onSuccess?.()
    })
  }

  const handleDelete = async () => {
    if (!existingFeedback) return
    if (!confirm('Delete this feedback? This cannot be undone.')) return
    setIsDeleting(true)

    const supabase = createClient()
    const { error: err } = await supabase
      .from('coach_feedback')
      .delete()
      .eq('id', existingFeedback.id)
      .eq('coach_id', coachId)

    if (err) {
      setError(err.message)
      setIsDeleting(false)
      return
    }

    router.refresh()
    onSuccess?.()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">
          {isEditing ? 'Edit feedback' : `Feedback for ${studentName}`}
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Star rating */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Rating (optional)
        </label>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(null)}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? null : n)}
              onMouseEnter={() => setHoverRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'w-5 h-5 transition-colors',
                  displayRating != null && n <= displayRating
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-border hover:text-amber-300'
                )}
              />
            </button>
          ))}
          {rating != null && (
            <button
              onClick={() => setRating(null)}
              className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Lesson selector */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Related lesson (optional)
        </label>
        <select
          value={lessonId}
          onChange={e => setLessonId(e.target.value)}
          className="w-full h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none"
        >
          <option value="">— General feedback —</option>
          {lessons.map(l => (
            <option key={l.id} value={l.id}>{l.title}</option>
          ))}
        </select>
      </div>

      {/* Text */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Feedback <span className="text-destructive">*</span>
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError(null) }}
          rows={4}
          placeholder="Write your observations, encouragement, or areas for improvement…"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {isEditing ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-40 transition-colors"
          >
            {isDeleting
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Trash2 className="w-3 h-3" />
            }
            Delete
          </button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isPending || !text.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isEditing ? 'Save changes' : 'Submit feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}