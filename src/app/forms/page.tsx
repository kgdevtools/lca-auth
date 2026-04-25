"use client"

import PlayerRegistrationForm from "./register-player/PlayerRegistrationForm"
import * as React from "react"
import { CheckCircle2 } from "lucide-react"

export default function FormsPage() {
  const [success, setSuccess] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Player Registration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Join the Limpopo Chess Academy</p>
        </div>

        {success ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Registration submitted! We'll be in touch shortly.</span>
          </div>
        ) : (
          <PlayerRegistrationForm onSuccess={() => setSuccess(true)} />
        )}
      </div>
    </div>
  )
}
