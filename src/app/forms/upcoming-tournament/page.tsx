"use client"

import { UpcomingTournamentForm } from "@/components/forms/UpcomingTournamentForm"
import * as React from "react"

export default function UpcomingTournamentPage() {
  const [success, setSuccess] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Add Upcoming Tournament
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create a new tournament listing
          </p>
        </div>

        {success ? (
          <div className="max-w-2xl mx-auto text-center py-16">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              SUCCESS TOURNAMENT UPLOADED
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Your tournament will appear in featured upcoming tournaments.
            </p>
            <div className="space-y-4">
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