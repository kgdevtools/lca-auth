import { createClient } from "@/utils/supabase/server"
import PlayersTable from "./PlayersTable"
import TeamStandingsTable from "./TeamStandingsTable"
import TeamPlayerStatsTable from "./TeamPlayerStatsTable"
import { getTeamTournamentDetails } from "./team-server-actions"
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

  // Try to fetch from tournaments table first
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", params.id)
    .single()

  // If not found in tournaments, try team_tournaments
  let isTeamTournament = false
  let teamTournament = null

  if (tError || !tournament) {
    const { data: teamData, error: teamError } = await supabase
      .from("team_tournaments")
      .select("*")
      .eq("id", params.id)
      .single()

    if (teamError || !teamData) {
      console.error("Error fetching tournament:", tError || teamError)
      return (
        <div className="min-h-dvh p-6 flex items-center justify-center">
          <div className="max-w-md text-center space-y-4">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-destructive">Tournament not found</h1>
            <p className="text-sm text-muted-foreground">Error: {(tError || teamError)?.message}</p>
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

    isTeamTournament = true
    teamTournament = teamData
  }

  const tournamentData = isTeamTournament ? teamTournament : tournament

  // Fetch players based on tournament type
  let normalizedPlayers: Player[] = []

  if (isTeamTournament) {
    // Fetch team tournament details
    const teamDetails = await getTeamTournamentDetails(params.id)

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
                  {tournamentData.tournament_name}
                </h1>
                <span className="inline-flex items-center text-xs sm:text-sm font-medium text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  Team Tournament
                </span>
              </div>
              {tournamentData.source && (
                <p className="text-xs text-muted-foreground">
                  Source: {tournamentData.source}
                </p>
              )}
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournamentData.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Location</p>
                    <p className="text-sm font-semibold text-foreground">{tournamentData.location}</p>
                  </div>
                </div>
              )}

              {tournamentData.date && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Date</p>
                    <p className="text-sm font-semibold text-foreground">{tournamentData.date}</p>
                  </div>
                </div>
              )}

              {tournamentData.rounds !== null && (
                <div className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rounds</p>
                    <p className="text-sm font-semibold text-foreground">{tournamentData.rounds}</p>
                  </div>
                </div>
              )}

              {tournamentData.chief_arbiter && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Chief Arbiter</p>
                    <p className="text-sm font-semibold text-foreground">{tournamentData.chief_arbiter}</p>
                  </div>
                </div>
              )}

              {tournamentData.organizer && (
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Organizer</p>
                    <p className="text-sm font-semibold text-foreground">{tournamentData.organizer}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap gap-4 sm:gap-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground font-semibold">{teamDetails.standings.teams.length}</strong> teams
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground font-semibold">{teamDetails.playerStats.length}</strong> players
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground font-semibold">{teamDetails.standings.totalRounds}</strong> rounds
                </span>
              </div>
            </div>

            {/* Additional Info - Collapsible on mobile */}
            {(tournamentData.deputy_chief_arbiter || tournamentData.arbiter || tournamentData.tournament_director) && (
              <details className="pt-4 border-t border-border">
                <summary className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors">
                  More Information
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {tournamentData.deputy_chief_arbiter && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Deputy Chief Arbiter</p>
                      <p className="text-sm text-foreground">{tournamentData.deputy_chief_arbiter}</p>
                    </div>
                  )}
                  {tournamentData.arbiter && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Arbiter</p>
                      <p className="text-sm text-foreground">{tournamentData.arbiter}</p>
                    </div>
                  )}
                  {tournamentData.tournament_director && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Tournament Director</p>
                      <p className="text-sm text-foreground">{tournamentData.tournament_director}</p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Team Standings */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Team Standings
          </h2>
          <TeamStandingsTable
            teams={teamDetails.standings.teams}
            totalRounds={teamDetails.standings.totalRounds}
          />
        </div>

        {/* Individual Player Statistics */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6" />
            Individual Player Statistics
          </h2>
          <TeamPlayerStatsTable
            players={teamDetails.playerStats}
            totalRounds={teamDetails.standings.totalRounds}
          />
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

  normalizedPlayers = players || []

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
                {tournamentData.tournament_name}
              </h1>
              {tournamentData.tournament_type && (
                <span className="inline-flex items-center text-xs sm:text-sm font-medium text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {tournamentData.tournament_type}
                </span>
              )}
            </div>
            {tournamentData.source && (
              <p className="text-xs text-muted-foreground">
                Source: {tournamentData.source}
              </p>
            )}
          </div>

          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournamentData.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Location</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.location}</p>
                </div>
              </div>
            )}

            {tournamentData.date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Date</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.date}</p>
                </div>
              </div>
            )}

            {tournamentData.rounds !== null && (
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Rounds</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.rounds}</p>
                </div>
              </div>
            )}

            {tournamentData.chief_arbiter && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Chief Arbiter</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.chief_arbiter}</p>
                </div>
              </div>
            )}

            {tournamentData.organizer && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Organizer</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.organizer}</p>
                </div>
              </div>
            )}

            {tournamentData.time_control && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Time Control</p>
                  <p className="text-sm font-semibold text-foreground">{tournamentData.time_control}</p>
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
            {tournamentData.average_elo !== null && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Avg Rating: <strong className="text-foreground font-semibold">{tournamentData.average_elo}</strong>
                </span>
              </div>
            )}
            {tournamentData.average_age !== null && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Avg Age: <strong className="text-foreground font-semibold">{tournamentData.average_age}</strong>
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
          {(tournamentData.deputy_chief_arbiter || tournamentData.arbiter || tournamentData.tournament_director || tournamentData.federation || tournamentData.rate_of_play || tournamentData.rating_calculation) && (
            <details className="pt-4 border-t border-border">
              <summary className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors">
                More Information
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {tournamentData.deputy_chief_arbiter && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Deputy Chief Arbiter</p>
                    <p className="text-sm text-foreground">{tournamentData.deputy_chief_arbiter}</p>
                  </div>
                )}
                {tournamentData.arbiter && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Arbiter</p>
                    <p className="text-sm text-foreground">{tournamentData.arbiter}</p>
                  </div>
                )}
                {tournamentData.tournament_director && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tournament Director</p>
                    <p className="text-sm text-foreground">{tournamentData.tournament_director}</p>
                  </div>
                )}
                {tournamentData.federation && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Federation</p>
                    <p className="text-sm text-foreground">{tournamentData.federation}</p>
                  </div>
                )}
                {tournamentData.rate_of_play && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rate of Play</p>
                    <p className="text-sm text-foreground">{tournamentData.rate_of_play}</p>
                  </div>
                )}
                {tournamentData.rating_calculation && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Rating Calculation</p>
                    <p className="text-sm text-foreground">{tournamentData.rating_calculation}</p>
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
