import { createClient } from "@/utils/supabase/server"
import PlayersTable from "./PlayersTable"

interface Player {
  id: number
  name: string
  federation: string
  rank: number
  rating: number
  points: number
  rounds: any
  tie_breaks: any
}

export default async function TournamentPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  // Await params and searchParams
  const params = await props.params

  const supabase = await createClient()

  console.log("Fetching tournament with ID:", params.id)

  // Fetch tournament info - use tournament_name instead of name
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("id, tournament_name, location, date")
    .eq("id", params.id)
    .single()

  if (tError) {
    console.error("Error fetching tournament:", tError)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-destructive">Tournament not found</h1>
        <p className="text-sm text-muted-foreground">Error: {tError.message}</p>
        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
      </div>
    )
  }

  if (!tournament) {
    console.error("No tournament found with ID:", params.id)
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-destructive">Tournament not found</h1>
        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
      </div>
    )
  }

  console.log("Tournament found:", tournament)

  // Fetch ALL players (no pagination) - this is crucial for opponent lookup
  const { data: players, error: pError } = await supabase
    .from("players")
    .select("id, name, federation, rank, rating, points, rounds, tie_breaks")
    .eq("tournament_id", params.id)
    .order("rank", { ascending: true })

  if (pError) {
    console.error("Error fetching players:", pError)
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-destructive">Failed to load players: {pError.message}</h2>
      </div>
    )
  }

  console.log("Players found:", players?.length)

  // Declare normalizedPlayers variable
  const normalizedPlayers = players || []

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-lg border border-border bg-card shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
            {tournament.tournament_name}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm md:text-base text-muted-foreground font-medium mb-2">
            <span className="inline-block">
              <span className="font-semibold text-foreground">ID:</span> {tournament.id}
            </span>
            {tournament.location && (
              <span className="inline-block">
                <span className="font-semibold text-foreground">Location:</span> {tournament.location}
              </span>
            )}
            {tournament.date && (
              <span className="inline-block">
                <span className="font-semibold text-foreground">Date:</span> {tournament.date}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">Players:</strong> {normalizedPlayers.length}
            </span>
            <span>
              <strong className="text-foreground">Avg Top 10:</strong> {(() => {
                const top10 = [...normalizedPlayers].sort((a, b) => b.rating - a.rating).slice(0, 10)
                if (!top10.length) return "-"
                const avg = Math.round(top10.reduce((acc, p) => acc + (p.rating || 0), 0) / top10.length)
                return avg
              })()}
            </span>
          </div>
        </div>
      </div>
      {/* Players Table */}
      <PlayersTable players={normalizedPlayers} />
    </div>
  )
}
