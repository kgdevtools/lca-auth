"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Phone, CreditCard } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSubmitting(false)
    onSuccess()
  }

  function update<K extends keyof PlayerRegistrationPayload>(key: K, value: PlayerRegistrationPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div id="player-registration" className="w-full max-w-none mx-auto">
      <div className="bg-card rounded-sm p-4 sm:p-6 lg:p-8 xl:p-12 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="text-center">
            <div className="relative w-full max-w-md mx-auto h-20 sm:h-24 md:h-28">
              <Image
                src="/Picture1.png"
                alt="Limpopo Chess Academy logo (light)"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain block dark:hidden"
              />
              <Image
                src="/LCA_Logo_Dark.png"
                alt="Limpopo Chess Academy logo (dark)"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain hidden dark:block"
              />
            </div>
          </div>

          {error ? (
            <Alert className="border-destructive/50 bg-destructive/10 text-destructive max-w-2xl mx-auto">
              {error}
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Player Information */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">First name</label>
                  <input
                    required
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Last name</label>
                  <input
                    required
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date of birth</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.dob}
                    onChange={(e) => update("dob", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Experience</label>
                  <select
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.experience}
                    onChange={(e) => update("experience", e.target.value as ExperienceLevel)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">FIDE ID (optional)</label>
                  <input
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.fideId ?? ""}
                    onChange={(e) => update("fideId", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">ChessSA ID (optional)</label>
                  <input
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.chessSaId ?? ""}
                    onChange={(e) => update("chessSaId", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Rating (optional)</label>
                  <input
                    type="number"
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Parent/Guardian name (optional)
                  </label>
                  <input
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.parentName ?? ""}
                    onChange={(e) => update("parentName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Parent/Guardian contact (optional)
                  </label>
                  <input
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.parentContact ?? ""}
                    onChange={(e) => update("parentContact", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Emergency contact name</label>
                  <input
                    required
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.emergencyContact}
                    onChange={(e) => update("emergencyContact", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Emergency phone</label>
                  <input
                    required
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    value={form.emergencyPhone}
                    onChange={(e) => update("emergencyPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Program Selection */}
            <div className="space-y-6">
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Academy Programs & Pricing
                  </h2>
                </div>
                <div className="space-y-4">
                  {/* Limpopo Chess Academy */}
                  <div className="p-4 rounded-sm bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        <span className="text-primary bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Join Limpopo Chess Academy</span>
                      </h3>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                        Academy
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />4 sessions per month, 2 hours each
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Physical or online lessons available
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between">
                          <span className="text-foreground">Monthly fee:</span>
                          <span className="font-semibold text-foreground">R600</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Polokwane Chess Club */}
                  <div className="p-4 rounded-sm bg-red-50 dark:bg-red-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">Polokwane Chess Club</span>
                      </h3>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                        Club
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Thursdays, 4:00 PM - 9:00 PM
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Physical location only
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-foreground">Monthly membership:</span>
                          <span className="font-semibold text-foreground">R150</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-foreground">Single day visit:</span>
                          <span className="font-semibold text-foreground">R50</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Program Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Select Program</label>
                    <select
                      className="w-full rounded-sm bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                      value={form.selectedProgram ?? ""}
                      onChange={(e) =>
                        update("selectedProgram", e.target.value as "polokwane" | "limpopo" | "both" | undefined)
                      }
                    >
                      <option value="">Select a program</option>
                      <option value="polokwane">Polokwane Chess Club</option>
                      <option value="limpopo">Limpopo Chess Academy</option>
                      <option value="both">Both Programs</option>
                    </select>
                  </div>
                </div>
                  {/* Lesson Type Selection */}
                  {form.selectedProgram === "limpopo" || form.selectedProgram === "both" ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Lesson Type</label>
                      <select
                        className="w-full rounded-sm bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        value={form.lessonType ?? "physical"}
                        onChange={(e) => update("lessonType", e.target.value as "physical" | "online" | "both")}
                      >
                        <option value="physical">Physical lessons</option>
                        <option value="online">Online lessons</option>
                        <option value="both">Both physical and online</option>
                      </select>
                    </div>
                  ) : null}

                  {/* Contact Information */}
                  <div className="p-4 rounded-sm bg-primary/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Need more information?</span>
                    </div>
                    <Link
                      href="/forms/contact-us"
                      className="text-sm text-primary hover:text-primary/80 underline underline-offset-2"
                    >
                      Contact us here for questions about programs, scheduling, or pricing
                    </Link>
                  </div>
                </div>

                {/* Comments Section */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Comments (optional)</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-sm bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
                    placeholder="Any additional information, special requirements, or questions..."
                    value={form.comments ?? ""}
                    onChange={(e) => update("comments", e.target.value)}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Submitting…" : "Register Player"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    )
  }
  
  export default PlayerRegistrationForm
  

