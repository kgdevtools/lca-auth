"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Phone, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { registerPlayer } from "./server-actions"
import { cn } from "@/lib/utils"

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
  selectedProgram?: "polokwane" | "limpopo" | "both"
  lessonType?: "physical" | "online" | "both"
}

const INPUT =
  "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50 transition-colors"

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function Field({
  label,
  optional,
  children,
}: {
  label: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">· optional</span>}
      </label>
      {children}
    </div>
  )
}

const PROGRAMS = [
  {
    value: "limpopo" as const,
    label: "Limpopo Chess Academy",
    meta: "4 sessions/month · Physical or online",
  },
  {
    value: "polokwane" as const,
    label: "Polokwane Chess Club",
    meta: "Thursdays 4:00–9:00 PM · Physical only",
  },
  {
    value: "both" as const,
    label: "Both Programs",
    meta: "LCA Academy + Polokwane Chess Club",
  },
]

const LESSON_FORMATS: { value: "physical" | "online" | "both"; label: string }[] = [
  { value: "physical", label: "Physical" },
  { value: "online", label: "Online" },
  { value: "both", label: "Both" },
]

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
    selectedProgram: undefined,
    lessonType: "physical",
  })
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await registerPlayer(form)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || "Failed to submit registration")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function update<K extends keyof PlayerRegistrationPayload>(key: K, value: PlayerRegistrationPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const showLessonType = form.selectedProgram === "limpopo" || form.selectedProgram === "both"

  return (
    <div className="bg-card rounded-sm border border-border shadow-sm">
      <form onSubmit={handleSubmit}>
        {/* Logo bar */}
        <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-border">
          <div className="relative w-40 sm:w-48 h-11">
            <Image
              src="/Picture1.png"
              alt="Limpopo Chess Academy"
              fill
              sizes="192px"
              className="object-contain object-left block dark:hidden"
            />
            <Image
              src="/LCA_Logo_Dark.png"
              alt="Limpopo Chess Academy"
              fill
              sizes="192px"
              className="object-contain object-left hidden dark:block"
            />
          </div>
        </div>

        {/* Form body */}
        <div className="px-4 sm:px-6 py-5 space-y-0">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 mb-5 rounded-sm border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* ── Left column ── */}
            <div className="space-y-5">
              {/* Player details */}
              <div>
                <SectionHeader label="Player Details" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name">
                    <input
                      required
                      className={INPUT}
                      value={form.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      required
                      className={INPUT}
                      value={form.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                    />
                  </Field>
                  <Field label="Date of birth">
                    <input
                      required
                      type="date"
                      className={INPUT}
                      value={form.dob}
                      onChange={(e) => update("dob", e.target.value)}
                    />
                  </Field>
                  <Field label="Experience">
                    <select
                      className={INPUT}
                      value={form.experience}
                      onChange={(e) => update("experience", e.target.value as ExperienceLevel)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Identification */}
              <div>
                <SectionHeader label="Identification" />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="FIDE ID" optional>
                    <input
                      className={INPUT}
                      value={form.fideId ?? ""}
                      onChange={(e) => update("fideId", e.target.value)}
                    />
                  </Field>
                  <Field label="ChessSA ID" optional>
                    <input
                      className={INPUT}
                      value={form.chessSaId ?? ""}
                      onChange={(e) => update("chessSaId", e.target.value)}
                    />
                  </Field>
                  <Field label="Rating" optional>
                    <input
                      type="number"
                      className={INPUT}
                      value={form.rating ?? ""}
                      onChange={(e) => {
                        const v = e.target.value
                        update(
                          "rating",
                          v === "" ? (undefined as unknown as number) : Number.isNaN(Number(v)) ? (undefined as unknown as number) : Number(v)
                        )
                      }}
                    />
                  </Field>
                </div>
              </div>

              {/* Parent / Guardian */}
              <div>
                <SectionHeader label="Parent / Guardian" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" optional>
                    <input
                      className={INPUT}
                      value={form.parentName ?? ""}
                      onChange={(e) => update("parentName", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact" optional>
                    <input
                      className={INPUT}
                      value={form.parentContact ?? ""}
                      onChange={(e) => update("parentContact", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <SectionHeader label="Emergency Contact" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <input
                      required
                      className={INPUT}
                      value={form.emergencyContact}
                      onChange={(e) => update("emergencyContact", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      required
                      className={INPUT}
                      value={form.emergencyPhone}
                      onChange={(e) => update("emergencyPhone", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-5">
              {/* Program selection */}
              <div>
                <SectionHeader label="Program" />
                <div className="space-y-1.5">
                  {PROGRAMS.map(({ value, label, meta }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("selectedProgram", value)}
                      className={cn(
                        "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-sm border transition-colors",
                        form.selectedProgram === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/30 hover:bg-muted/30"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
                      </div>
                      {form.selectedProgram === value && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson format — conditional */}
              {showLessonType && (
                <div>
                  <SectionHeader label="Lesson Format" />
                  <div className="grid grid-cols-3 gap-1.5">
                    {LESSON_FORMATS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("lessonType", value)}
                        className={cn(
                          "py-2 px-3 rounded-sm border text-xs font-medium text-center transition-colors",
                          form.lessonType === value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <SectionHeader label="Notes" />
                <Field label="Comments" optional>
                  <textarea
                    rows={3}
                    className={cn(INPUT, "resize-none")}
                    placeholder="Additional info, special requirements, or questions…"
                    value={form.comments ?? ""}
                    onChange={(e) => update("comments", e.target.value)}
                  />
                </Field>
              </div>

              {/* Contact link */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm border border-border bg-muted/30">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Questions about programs?{" "}
                  <Link
                    href="/forms/contact-us"
                    className="text-foreground font-medium hover:underline underline-offset-2"
                  >
                    Contact us
                  </Link>
                </p>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Register Player"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default PlayerRegistrationForm
