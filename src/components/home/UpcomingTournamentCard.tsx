import Image from "next/image"
import Link from "next/link"
import { getNextUpcomingTournament } from "@/repositories/upcomingTournamentRepo"
import type { UpcomingTournament } from "@/types/upcoming-tournament"
import { cache } from "@/utils/cache"

export async function UpcomingTournamentCardServer() {
  try {
    const tournament = await getNextUpcomingTournament()

      if (!tournament) {
        return (
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col h-full min-h-[280px]">
            <h2 className="text-lg font-bold mb-3 text-primary">Upcoming Tournament</h2>
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-muted-foreground">No upcoming tournaments</p>
            </div>
          </div>
        )
      }

    return <UpcomingTournamentCardClient tournament={tournament} />
  } catch (error) {
    console.error('Error in UpcomingTournamentCardServer:', error)
        return (
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col min-h-[280px]">
            <h2 className="text-lg font-bold mb-4 text-primary">Upcoming Tournament</h2>
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-muted-foreground">Error loading tournament</p>
            </div>
          </div>
        )
  }
}

interface UpcomingTournamentCardClientProps {
  tournament: UpcomingTournament
}

function UpcomingTournamentCardClient({ tournament }: UpcomingTournamentCardClientProps) {
  return (
    <Link
      href={tournament.registration_form_link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg min-h-[280px]">
        {tournament.poster_url ? (
          <div className="relative w-full h-full min-h-[280px]">
            <Image
              src={tournament.poster_url}
              alt={tournament.tournament_name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized={tournament.poster_url.includes('supabase.co') || tournament.poster_url.includes('/uploads/')}
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-[280px] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-primary mb-2 line-clamp-3">
                {tournament.tournament_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Click to register
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}