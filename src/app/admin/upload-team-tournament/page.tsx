import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadTeamTournamentForm } from "./upload-form"
import { SummaryUploadForm } from "./summary-upload-form"

export const dynamic = "force-dynamic"

export default function UploadTeamTournamentPage() {
  return (
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Upload Team Tournament</h1>
        <p className="text-sm text-muted-foreground">
          Team events have two parts. <strong>Step 1</strong> brings the tournament into the rankings;{" "}
          <strong>Step 2</strong> (optional) adds who-played-whom for player profiles. These are{" "}
          <em>not</em> individual crosstables — for a single-player event use{" "}
          <Link href="/admin/upload-tournament" className="font-semibold text-primary hover:underline">
            Add Individual Tournament
          </Link>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 1 — Summary files (required, for rankings)</CardTitle>
          <CardDescription>
            Upload <strong>both</strong> whole-tournament files <strong>together</strong>: the{" "}
            <strong>Team Composition with Points</strong> and the <strong>Player Performance List</strong>.
            This creates the team standings and each player&rsquo;s performance rating (ratP) that feeds
            the player rankings. Upload the pair once for the whole event (not per round).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummaryUploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2 — Round pairings (optional, for opponents)</CardTitle>
          <CardDescription>
            Upload the board-pairing file for each round (one file per round). This records who played
            whom so it shows on player-profile Opponents/Tournaments tabs. Not needed for rankings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadTeamTournamentForm />
        </CardContent>
      </Card>
    </main>
  )
}
