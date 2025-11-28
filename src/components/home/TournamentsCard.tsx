import { getTournaments } from '@/app/tournaments/server-actions'
import Link from 'next/link'
import { Calendar, MapPin, Users, Trophy, ArrowRight } from 'lucide-react'

export async function TournamentsCard() {
  const tournaments = await getTournaments()
  const latestTournament = tournaments[0]

  if (!latestTournament) {
    return (
      <div className="h-full rounded-lg border border-border bg-card p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-primary">Latest Tournament</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-muted-foreground">No tournaments yet</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date TBA"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Link
      href={`/tournaments/${latestTournament.id}`}
      className="group relative aspect-square rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden block"
    >
      <div className="p-4 sm:p-5 md:p-6 h-full flex flex-col overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-primary group-hover:text-primary/80 flex items-center gap-2">
            Latest Tournament
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </h2>
          {latestTournament.tournament_type && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs sm:text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
              {latestTournament.tournament_type}
            </span>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {latestTournament.tournament_name}
        </h3>

        <div className="space-y-3 sm:space-y-4 text-base sm:text-lg flex-1">
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-primary/70" />
            <span className="line-clamp-1 font-medium">{latestTournament.location || "Location TBA"}</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-primary/70" />
            <span className="font-medium">{formatDate(latestTournament.date)}</span>
          </div>

          {latestTournament.chief_arbiter && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-primary/70" />
              <span className="line-clamp-1 font-medium">CA: {latestTournament.chief_arbiter}</span>
            </div>
          )}

          {latestTournament.rounds && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-primary/70" />
              <span className="font-medium">{latestTournament.rounds} Rounds</span>
            </div>
          )}
        </div>

        {latestTournament.average_elo && (
          <div className="mt-auto pt-4 border-t border-border">
            <div className="text-base sm:text-lg text-muted-foreground">
              Avg Rating: <span className="font-bold text-foreground text-lg sm:text-xl text-primary">{Math.round(latestTournament.average_elo)}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
