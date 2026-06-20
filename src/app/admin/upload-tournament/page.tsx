import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadForm } from "./upload-form"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Individual Tournament</CardTitle>
          <CardDescription>
            For a single-player (individual) Swiss tournament. Upload one Excel <strong>crosstable</strong>{" "}
            (final standings with tie-breaks) to create the tournament and its players.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <strong>Team tournament?</strong> Don&rsquo;t upload it here — a team event&rsquo;s files (Team
        Composition / Player Performance List / round pairings) aren&rsquo;t crosstables and will fail or
        create empty rows. Use{" "}
        <Link href="/admin/upload-team-tournament" className="font-semibold text-primary hover:underline">
          Upload Team Tournament
        </Link>{" "}
        instead.
      </div>
    </main>
  )
}


