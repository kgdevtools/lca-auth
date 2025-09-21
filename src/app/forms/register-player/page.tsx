"use client"

import PlayerRegistrationForm from "./PlayerRegistrationForm"
import * as React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

export default function RegisterPlayerPage() {
  const [success, setSuccess] = React.useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Player Registration
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Join the LCA Chess Academy</p>
        </div>

        {success ? (
          <Alert className="border-2 border-green-500/20 bg-green-50 dark:bg-green-950/50 rounded shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
              Registration successful! We'll be in touch soon.
            </AlertDescription>
          </Alert>
        ) : (
          <PlayerRegistrationForm onSuccess={() => setSuccess(true)} />
        )}
      </div>
    </div>
  )
}
