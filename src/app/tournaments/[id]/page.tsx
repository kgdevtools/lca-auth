// src/app/tournaments/[id]/page.tsx
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
  const params = await props.params;

  const supabase = await createClient()

  console.log("Fetching tournament with ID:", params.id);

  // Fetch tournament info - use tournament_name instead of name
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("id, tournament_name, location, date")
    .eq("id", params.id)
    .single()

  if (tError) {
    console.error("Error fetching tournament:", tError);
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-500">Tournament not found</h1>
        <p className="text-sm text-muted-foreground">Error: {tError.message}</p>
        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
      </div>
    )
  }

  if (!tournament) {
    console.error("No tournament found with ID:", params.id);
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-500">Tournament not found</h1>
        <p className="text-sm text-muted-foreground">ID: {params.id}</p>
      </div>
    )
  }

  console.log("Tournament found:", tournament);

  // Fetch ALL players (no pagination) - this is crucial for opponent lookup
  const { data: players, error: pError } = await supabase
    .from("players")
    .select("id, name, federation, rank, rating, points, rounds, tie_breaks")
    .eq("tournament_id", params.id)
    .order("rank", { ascending: true })

  if (pError) {
    console.error("Error fetching players:", pError);
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-red-500">
          Failed to load players: {pError.message}
        </h2>
      </div>
    )
  }

  console.log("Players found:", players?.length);

  // Normalize player data with better type handling
  const normalizedPlayers =
    players?.map((p: Player) => {
      let rounds = []
      try {
        // Handle different data types for rounds
        if (typeof p.rounds === "string") {
          rounds = JSON.parse(p.rounds)
        } else if (Array.isArray(p.rounds)) {
          rounds = p.rounds
        } else if (p.rounds && typeof p.rounds === "object") {
          // Handle case where rounds might be an object instead of array
          rounds = Object.values(p.rounds)
        } else {
          rounds = []
        }
      } catch (e) {
        console.error("Error parsing rounds for player", p.id, ":", e)
        console.log("Raw rounds data:", p.rounds)
        rounds = []
      }

      let tieBreaks: Record<string, any> = {}
      try {
        // Handle different data types for tie_breaks
        if (typeof p.tie_breaks === "string") {
          tieBreaks = JSON.parse(p.tie_breaks)
        } else if (p.tie_breaks && typeof p.tie_breaks === "object") {
          tieBreaks = p.tie_breaks
        } else {
          tieBreaks = {}
        }
      } catch (e) {
        console.error("Error parsing tie_breaks for player", p.id, ":", e)
        console.log("Raw tie_breaks data:", p.tie_breaks)
        tieBreaks = {}
      }

      return {
        ...p,
        rounds: Array.isArray(rounds) ? rounds : [],
        tie_breaks: tieBreaks,
        // Keep individual TB values for backward compatibility
        tb1: tieBreaks.TB1 ?? 0,
        tb2: tieBreaks.TB2 ?? 0,
        tb3: tieBreaks.TB3 ?? 0,
      }
    }) || []

  return (
    <div className="p-6 space-y-6">
      {/* Tournament Metadata Card - Enhanced */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-lg p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900 dark:text-blue-100 leading-tight mb-2">{tournament.tournament_name}</h1>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-base md:text-lg text-blue-800 dark:text-blue-200 font-medium mb-2">
            <span className="inline-block"><span className="font-semibold text-blue-700 dark:text-blue-300">ID:</span> {tournament.id}</span>
            {tournament.location && <span className="inline-block"><span className="font-semibold text-blue-700 dark:text-blue-300">Location:</span> {tournament.location}</span>}
            {tournament.date && <span className="inline-block"><span className="font-semibold text-blue-700 dark:text-blue-300">Date:</span> {tournament.date}</span>}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm md:text-base text-blue-700 dark:text-blue-300">
            <span><strong>Players:</strong> {normalizedPlayers.length}</span>
            <span><strong>Avg Top 10:</strong> {(() => {
              const top10 = [...normalizedPlayers].sort((a, b) => b.rating - a.rating).slice(0, 10);
              if (!top10.length) return '-';
              const avg = Math.round(top10.reduce((acc, p) => acc + (p.rating || 0), 0) / top10.length);
              return avg;
            })()}</span>
          </div>
        </div>
      </div>
      {/* Players Table */}
      <PlayersTable players={normalizedPlayers} />
    </div>
  )
}
