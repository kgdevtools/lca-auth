import Image from "next/image";
import Link from "next/link";
import { getNextUpcomingTournament } from "@/repositories/upcomingTournamentRepo";
import type { UpcomingTournament } from "@/types/upcoming-tournament";

export async function UpcomingTournamentCardServer() {
  try {
    const tournament = await getNextUpcomingTournament();

    if (!tournament) {
      return (
        <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-4 flex flex-col min-h-[280px]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Link
              href="/events"
              className="font-geist-sans text-lg font-bold text-primary"
            >
              Upcoming Tournament
            </Link>
            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-sm bg-muted text-muted-foreground/40 select-none">
              Register
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              No upcoming tournaments
            </p>
          </div>
        </div>
      );
    }

    return <UpcomingTournamentCardClient tournament={tournament} />;
  } catch (error) {
    console.error("Error in UpcomingTournamentCardServer:", error);
    return (
      <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-4 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <Link
            href="/events"
            className="font-geist-sans text-lg font-bold text-primary"
          >
            Upcoming Tournament
          </Link>
          <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-sm bg-muted text-muted-foreground/40 select-none">
            Register
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Error loading tournament
          </p>
        </div>
      </div>
    );
  }
}

interface UpcomingTournamentCardClientProps {
  tournament: UpcomingTournament;
}

function UpcomingTournamentCardClient({
  tournament,
}: UpcomingTournamentCardClientProps) {
  const hasLink = Boolean(tournament.registration_form_link?.trim());
  const hasPoster = Boolean(tournament.poster_url?.trim());

  const formattedDate = tournament.tournament_date
    ? new Date(tournament.tournament_date).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const CardInner = (
    <div className="rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card/80 dark:bg-card/60 backdrop-blur-sm">
      {hasPoster ? (
        /*
          Use a regular <img> tag instead of next/image to avoid domain
          configuration issues in dev. object-contain ensures the full
          poster is always visible without cropping.
        */
        <div className="w-full bg-black flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.poster_url!}
            alt={tournament.tournament_name}
            className="w-full h-auto object-contain max-h-[600px]"
            loading="eager"
          />
        </div>
      ) : (
        <div className="p-4 space-y-2">
          <h3 className="text-base sm:text-lg font-extrabold leading-snug text-foreground line-clamp-3">
            {tournament.tournament_name}
          </h3>
          {formattedDate && (
            <p className="text-sm font-semibold text-primary">
              {formattedDate}
            </p>
          )}
          {tournament.location && (
            <p className="text-sm text-foreground/80">
              📍 {tournament.location}
            </p>
          )}
          {tournament.organizer_contact && (
            <p className="text-sm text-foreground/70">
              📞 {tournament.organizer_contact}
            </p>
          )}
          {tournament.organizer_name && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/60">Organiser:</span>{" "}
              {tournament.organizer_name}
            </p>
          )}
          {tournament.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {tournament.description}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="block group">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Link
          href="/events"
          className="font-geist-sans text-lg font-bold text-primary hover:text-primary/80 transition-colors"
        >
          Upcoming Tournament
        </Link>
        {hasLink ? (
          <Link
            href={tournament.registration_form_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Register
          </Link>
        ) : (
          <span className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-sm bg-muted text-muted-foreground/40 select-none flex-shrink-0">
            Register
          </span>
        )}
      </div>

      {/* Card click target */}
      {hasPoster ? (
        <Link
          href={tournament.poster_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {CardInner}
        </Link>
      ) : hasLink ? (
        <Link
          href={tournament.registration_form_link}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {CardInner}
        </Link>
      ) : (
        <Link href="/events" className="block">
          {CardInner}
        </Link>
      )}
    </div>
  );
}
