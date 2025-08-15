"use client"

import dynamic from "next/dynamic"
import * as React from "react"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"

const PlayerRegistrationForm = dynamic(() => import("./PlayerRegistrationForm").then(m => m.PlayerRegistrationForm), { ssr: false })

export default function FormsPage() {
  const [success, setSuccess] = React.useState(false)
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tighter text-center mb-4">Player Registration</h1>
      {success ? (
        <Alert>Registration successful!</Alert>
      ) : (
        <Card className="p-4">
          <PlayerRegistrationForm onSuccess={() => setSuccess(true)} />
        </Card>
      )}
    </div>
  )
}



