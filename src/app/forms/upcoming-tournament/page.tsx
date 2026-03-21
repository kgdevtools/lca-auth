"use client"

import { UpcomingTournamentForm } from "@/components/forms/UpcomingTournamentForm"
import * as React from "react"

export default function UpcomingTournamentPage() {
  const [success, setSuccess] = React.useState(false)

  return (
    <div className="min-h-screen bg-background px-2 sm:px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl">
        {success ? (
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8 shadow-lg text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Tournament Created Successfully!
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your tournament will appear in featured upcoming tournaments.
            </p>
            <div className="space-y-3">
              <a
                href="https://forms.gle/9mxemKBjGphmkfgN8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Complete Registration
              </a>
              <button
                onClick={() => setSuccess(false)}
                className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Create Another Tournament
              </button>
            </div>
          </div>
        ) : (
          <UpcomingTournamentForm onSuccess={() => setSuccess(true)} />
        )}
      </div>
    </div>
  )
}
