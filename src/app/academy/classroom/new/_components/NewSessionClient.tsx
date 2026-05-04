'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClassroomSession } from '@/actions/academy/classroomActions'

export default function NewSessionClient() {
  const [title, setTitle]   = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Session title is required'); return }
    setError(null)
    startTransition(async () => {
      try {
        await createClassroomSession(title.trim())
      } catch (err: any) {
        // re-throw Next.js redirect errors; catch real errors
        if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
        setError(err?.message ?? 'Failed to create session')
      }
    })
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-7">
      <div className="mb-7">
        <Link
          href="/academy/classroom"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to classroom
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          New session
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Create a session and share the link with your students.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-sm border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs font-medium">
            Session title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Rook Endings — Beginner Group"
            className="text-sm"
            autoFocus
            disabled={isPending}
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
            {isPending ? 'Creating…' : 'Create session'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => router.push('/academy/classroom')}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
