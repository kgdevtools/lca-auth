import { createClient } from "@/utils/supabase/server"
import PlayersTable from "./PlayersTable"
import { Calendar, MapPin, Users, Trophy, Award, Clock, Building } from "lucide-react"
import Link from "next/link"

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

  // Fetch tournament info with all fields
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single()

  if (tError) {
    console.error("Error fetching tournament:", tError)
    return (
      <div className="min-h-dvh p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-destructive">Tournament not found</h1>
          <p className="text-sm text-muted-foreground">Error: {tError.message}</p>
          <p className="text-xs text-muted-foreground">ID: {params.id}</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            Back to Tournaments
          </Link>
        </div>
      </div>
    )
  }

  if (!tournament) {
    console.error("No tournament found with ID:", params.id)
    return (
      <div className="min-h-dvh p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-destructive">Tournament not found</h1>
          <p className="text-sm text-muted-foreground">ID: {params.id}</p>
          <Link
            href="/tournaments"
            className="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
          >
            Back to Tournaments
          </Link>
        </div>
      </div>
    )
  }

  // Fetch ALL players (no pagination) - this is crucial for opponent lookup
  const { data: players, error: pError } = await supabase
    .from("players")
    .select("id, name, federation, rank, rating, points, rounds, tie_breaks")
    .eq("tournament_id", params.id)
    .order("rank", { ascending: true })

  if (pError) {
    console.error("Error fetching players:", pError)
    return (
      <div className="min-h-dvh p-6">
        <h2 className="text-lg font-semibold text-destructive">Failed to load players: {pError.message}</h2>
        <Link
          href="/tournaments"
          className="inline-flex items-center justify-center h-9 px-4 py-2 rounded-md border bg-card hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors mt-4"
        >
          Back to Tournaments
        </Link>
      </div>
    )
  }

  const normalizedPlayers = players || []

  return (
    <div className="min-h-dvh p-4 sm:p-6 lg:p-8 mx-auto max-w-[100rem]">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/tournaments"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to tournaments
        </Link>
      </div>

      {/* Tournament Header */}
      <div className="rounded-lg border border-border bg-card shadow-sm p-4 sm:p-6 mb-6">
        <div className="space-y-4">
          {/* Title and Type */}
          <div>
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight flex-1 min-w-0">
                {tournament.tournament_name}
              </h1>
              {tournament.tournament_type && (
                <span className="inline-flex items-center text-xs sm:text-sm font-medium text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {tournament.tournament_type}
                </span>
              )}
            </div>
            {tournament.source && (
              <p className="text-xs text-muted-foreground">
                Source: {tournament.source}
              </p>
            )}
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournament.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Location</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.location}</p>
                </div>
              </div>
            )}

            {tournament.date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Date</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.date}</p>
                </div>
              </div>
            )}

            {tournament.rounds !== null && (
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Rounds</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.rounds}</p>
                </div>
              </div>
            )}

            {tournament.chief_arbiter && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Chief Arbiter</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.chief_arbiter}</p>
                </div>
              </div>
            )}

            {tournament.organizer && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Organizer</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.organizer}</p>
                </div>
              </div>
            )}

            {tournament.time_control && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Time Control</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.time_control}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-4 sm:gap-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground font-semibold">{normalizedPlayers.length}</strong> players
              </span>
            </div>
            {tournament.average_elo !== null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Avg Rating: <strong className="text-foreground font-semibold">{tournament.average_elo}</strong>
                </span>
              </div>
            )}
            {tournament.average_age !== null && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Avg Age: <strong className="text-foreground font-semibold">{tournament.average_age}</strong>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Avg Top 10: <strong className="text-foreground font-semibold">{(() => {
                  const top10 = [...normalizedPlayers].sort((a, b) => b.rating - a.rating).slice(0, 10)
                  if (!top10.length) return "-"
                  const avg = Math.round(top10.reduce((acc, p) => acc + (p.rating || 0), 0) / top10.length)
                  return avg
                })()}</strong>
              </span>
            </div>
          </div>

          {/* Additional Info - Collapsible on mobile */}
          {(tournament.deputy_chief_arbiter || tournament.arbiter || tournament.tournament_director || tournament.federation || tournament.rate_of_play || tournament.rating_calculation) && (
            <details className="pt-4 border-t border-border">
              <summary className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors">
                More Information
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {tournament.deputy_chief_arbiter && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Deputy Chief Arbiter</p>
                    <p className="text-sm text-foreground">{tournament.deputy_chief_arbiter}</p>
                  </div>
                )}
                {tournament.arbiter && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Arbiter</p>
                    <p className="text-sm text-foreground">{tournament.arbiter}</p>
                  </div>
                )}
                {tournament.tournament_director && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tournament Director</p>
                    <p className="text-sm text-foreground">{tournament.tournament_director}</p>
                  </div>
                )}
                {tournament.federation && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Federation</p>
                    <p className="text-sm text-foreground">{tournament.federation}</p>
                  </div>
                )}
                {tournament.rate_of_play && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rate of Play</p>
                    <p className="text-sm text-foreground">{tournament.rate_of_play}</p>
                  </div>
                )}
                {tournament.rating_calculation && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rating Calculation</p>
                    <p className="text-sm text-foreground">{tournament.rating_calculation}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Players Table */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Player Standings</h2>
        <PlayersTable players={normalizedPlayers} />
      </div>
    </div>
  )
}
