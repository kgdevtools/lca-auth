"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { LogoMark } from "@/components/logo-mark"

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
    try {
      const res = await fetch("/forms/register-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Submission failed")
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function update<K extends keyof PlayerRegistrationPayload>(key: K, value: PlayerRegistrationPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <LogoMark className="mx-auto h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
      </div>
      {error ? (
        <Alert className="border-red-300 bg-red-50 text-red-700">{error}</Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">First name</label>
          <input
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Last name</label>
          <input
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Date of birth</label>
          <input
            type="date"
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Experience</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.experience}
            onChange={(e) => update("experience", e.target.value as ExperienceLevel)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">FIDE ID (optional)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.fideId ?? ""}
            onChange={(e) => update("fideId", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">ChessSA ID (optional)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.chessSaId ?? ""}
            onChange={(e) => update("chessSaId", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Rating (optional)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.rating ?? ""}
            onChange={(e) => {
              const val = e.target.value
              if (val === "") {
                update("rating", undefined as unknown as number)
              } else {
                const n = Number(val)
                update("rating", Number.isNaN(n) ? undefined as unknown as number : n)
              }
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Parent/Guardian name (optional)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.parentName ?? ""}
            onChange={(e) => update("parentName", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Parent/Guardian contact (optional)</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.parentContact ?? ""}
            onChange={(e) => update("parentContact", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Emergency contact name</label>
          <input
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.emergencyContact}
            onChange={(e) => update("emergencyContact", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Emergency phone</label>
          <input
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.emergencyPhone}
            onChange={(e) => update("emergencyPhone", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Comments (optional)</label>
          <textarea
            rows={6}
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={form.comments ?? ""}
            onChange={(e) => update("comments", e.target.value)}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Register"}
        </Button>
      </div>
    </form>
  )
}

export default PlayerRegistrationForm


