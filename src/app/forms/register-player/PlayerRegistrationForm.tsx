"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { LogoMark } from "@/components/logo-mark"
import { registerPlayer } from "./server-actions"

type ExperienceLevel = "beginner" | "intermediate" | "advanced"

export type PlayerRegistrationPayload = {
  firstName: string
  lastName: string
  dob: string
  parentName?: string
  parentContact?: string
  emergencyContact: string
  emergencyPhone: string
  experience: ExperienceLevel
  fideId?: string
  chessSaId?: string
  rating?: number
  comments?: string
}

export function PlayerRegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = React.useState<PlayerRegistrationPayload>({
    firstName: "",
    lastName: "",
    dob: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    emergencyPhone: "",
    experience: "beginner",
    fideId: "",
    chessSaId: "",
    comments: "",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await registerPlayer(form)
    setSubmitting(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    onSuccess()
  }

  function update<K extends keyof PlayerRegistrationPayload>(key: K, value: PlayerRegistrationPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-card border-2 border-border rounded-lg p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <LogoMark className="mx-auto h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
            </div>
            {error ? <Alert className="border-destructive/50 bg-destructive/10 text-destructive">{error}</Alert> : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">First name</label>
                <input
                  required
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Last name</label>
                <input
                  required
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date of birth</label>
                <input
                  type="date"
                  required
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.dob}
                  onChange={(e) => update("dob", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Experience</label>
                <select
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.experience}
                  onChange={(e) => update("experience", e.target.value as ExperienceLevel)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">FIDE ID (optional)</label>
                <input
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.fideId ?? ""}
                  onChange={(e) => update("fideId", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ChessSA ID (optional)</label>
                <input
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.chessSaId ?? ""}
                  onChange={(e) => update("chessSaId", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Rating (optional)</label>
                <input
                  type="number"
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.rating ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      update("rating", undefined as unknown as number)
                    } else {
                      const n = Number(val)
                      update("rating", Number.isNaN(n) ? (undefined as unknown as number) : n)
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Parent/Guardian name (optional)
                </label>
                <input
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.parentName ?? ""}
                  onChange={(e) => update("parentName", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Parent/Guardian contact (optional)
                </label>
                <input
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.parentContact ?? ""}
                  onChange={(e) => update("parentContact", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Emergency contact name</label>
                <input
                  required
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.emergencyContact}
                  onChange={(e) => update("emergencyContact", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Emergency phone</label>
                <input
                  required
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                  value={form.emergencyPhone}
                  onChange={(e) => update("emergencyPhone", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Comments (optional)</label>
                <textarea
                  rows={6}
                  className="w-full rounded border-2 border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
                  value={form.comments ?? ""}
                  onChange={(e) => update("comments", e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Submitting…" : "Register"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PlayerRegistrationForm
