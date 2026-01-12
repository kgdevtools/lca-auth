import { getTournaments } from '@/app/tournaments/server-actions'
import Link from 'next/link'
import { Calendar, MapPin, Trophy, ArrowRight } from 'lucide-react'

export async function CompactTournamentsCard() {
  const tournaments = await getTournaments()
  const latestTournament = tournaments[0]

  if (!latestTournament) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 flex flex-col h-full">
        <h2 className="text-lg font-bold mb-2 text-primary">Latest Tournament</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-muted-foreground text-sm">No tournaments yet</p>
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
      className="group relative rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden block flex-1 min-h-[280px]"
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-bold text-primary group-hover:text-primary/80 flex items-center gap-2">
            Latest Tournament
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </h2>
          {latestTournament.tournament_type && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20">
              {latestTournament.tournament_type}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
          {latestTournament.tournament_name}
        </h3>

        <div className="space-y-2 flex-1 flex flex-col justify-between py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0 text-primary/70" />
            <span className="text-sm font-medium">{latestTournament.location || "Location TBA"}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0 text-primary/70" />
            <span className="text-sm font-medium">{formatDate(latestTournament.date)}</span>
          </div>

          {latestTournament.chief_arbiter && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="w-4 h-4 flex-shrink-0 text-primary/70" />
              <span className="text-sm font-medium">CA: {latestTournament.chief_arbiter}</span>
            </div>
          )}
        </div>

        {latestTournament.average_elo && (
          <div className="mt-auto pt-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Avg Elo: <span className="font-bold text-foreground text-primary">{Math.round(latestTournament.average_elo)}</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}