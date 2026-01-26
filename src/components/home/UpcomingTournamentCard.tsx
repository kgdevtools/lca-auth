import Image from "next/image"
import Link from "next/link"
import { getNextUpcomingTournament } from "@/repositories/upcomingTournamentRepo"
import type { UpcomingTournament } from "@/types/upcoming-tournament"
import { cache } from "@/utils/cache"
import tournamentsData from "@/data/tournaments.json"

export async function UpcomingTournamentCardServer() {
  try {
    const tournament = await getNextUpcomingTournament()

    // If DB tournament is not present or missing poster/url, try calendar data as fallback
    let displayTournament: Partial<UpcomingTournament> | null = null

    if (tournament) {
      displayTournament = tournament
    }

    // Find next calendar tournament (from static JSON) using a simple cutoff
    const now = new Date()
    const todayAt10AM = new Date(now)
    todayAt10AM.setHours(10, 0, 0, 0)
    const cutoff = now > todayAt10AM ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : now

    if ((!displayTournament || (!displayTournament.poster_url && !displayTournament.registration_form_link)) && tournamentsData && tournamentsData.length) {
      const nextCal = tournamentsData.find((t: any) => new Date(t.startDate) >= cutoff)
      if (nextCal) {
        displayTournament = {
          tournament_name: nextCal.name,
          tournament_date: nextCal.startDate,
          location: nextCal.venue || nextCal.town,
          organizer_name: nextCal.organiser ?? (nextCal as any).organizer ?? null,
          poster_url: undefined,
          registration_form_link: '',
          description: undefined,
        } as Partial<UpcomingTournament>
      }
    }

    if (!displayTournament) {
      return (
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col h-full min-h-[280px]">
          <h2>
            <Link href="/events" className="text-lg font-bold mb-3 text-primary block">Upcoming Tournament</Link>
          </h2>
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-muted-foreground">No Upcoming tournaments</p>
          </div>
        </div>
      )
    }

    return <UpcomingTournamentCardClient tournament={displayTournament as UpcomingTournament} />
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
  const hasExternalLink = Boolean(tournament.registration_form_link && tournament.registration_form_link.trim())

  const CardInner = (
    <div className="rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg min-h-[280px] bg-card">
      {tournament.poster_url ? (
        <div className="relative w-full h-full min-h-[280px]">
          <Image
            src={tournament.poster_url}
            alt={tournament.tournament_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            unoptimized={tournament.poster_url?.includes?.('supabase.co') || tournament.poster_url?.includes?.('/uploads/')}
          />
        </div>
      ) : (
        <div className="w-full h-full min-h-[280px] flex items-center p-6">
          <div className="w-full">
            <h3 className="text-lg font-bold text-primary mb-2 line-clamp-2">{tournament.tournament_name}</h3>
            {tournament.tournament_date && (
              <p className="text-sm text-muted-foreground mb-1">{new Date(tournament.tournament_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            )}
            {(tournament.location || (tournament as any).town) && (
              <p className="text-sm text-foreground mb-1">{tournament.location || (tournament as any).town}</p>
            )}
            {tournament.organizer_name && (
              <p className="text-sm text-muted-foreground">Organiser: {tournament.organizer_name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="block group">
      <h2>
        <Link href="/events" className="text-lg font-bold mb-3 text-primary block">Upcoming Tournament</Link>
      </h2>
      {hasExternalLink ? (
        <a href={tournament.registration_form_link} target="_blank" rel="noopener noreferrer" className="block">
          {CardInner}
        </a>
      ) : (
        <Link href="/events" className="block">
          {CardInner}
        </Link>
      )}
    </div>
  )
}