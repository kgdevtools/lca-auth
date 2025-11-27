import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadTeamTournamentForm } from "./upload-form"

export const dynamic = "force-dynamic"

export default function UploadTeamTournamentPage() {
  return (
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload Team Tournament</CardTitle>
          <CardDescription>
            Upload board pairings for team tournament rounds. Each file contains one round of team matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadTeamTournamentForm />
        </CardContent>
      </Card>
    </main>
  )
}
