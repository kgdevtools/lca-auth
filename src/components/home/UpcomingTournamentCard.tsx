import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCarouselTournaments } from "@/repositories/upcomingTournamentRepo";
import type { UpcomingTournament } from "@/types/upcoming-tournament";
import { UpcomingTournamentCarousel } from "./UpcomingTournamentCarousel";

/** Drop poster_url when the referenced local file doesn't exist, so the carousel
 *  shows the data layout instead of a broken image. Remote URLs pass through. */
function resolvePosters(items: UpcomingTournament[]): UpcomingTournament[] {
  return items.map((t) => {
    const url = t.poster_url?.trim();
    if (!url || /^https?:\/\//.test(url)) return t;
    const local = join(process.cwd(), "public", url.replace(/^\//, ""));
    return existsSync(local) ? t : { ...t, poster_url: undefined };
  });
}

/** Shared header row: title link + actions. Register renders only when a link exists. */
function CardHeader({ registrationLink }: { registrationLink?: string | null }) {
  const hasLink = Boolean(registrationLink?.trim());
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <Link
        href="/events"
        className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
      >
        Upcoming Tournament
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/forms/upcoming-tournament"
          className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-colors flex-shrink-0"
        >
          Organizer?
        </Link>
        {hasLink && (
          <Link
            href={registrationLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Register
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col h-full min-h-[360px]">
      <CardHeader />
      <div className="rounded border border-border bg-card flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </div>
  );
}

export async function UpcomingTournamentCardServer() {
  try {
    const items = resolvePosters(await getCarouselTournaments());
    if (!items.length) return <EmptyState label="No upcoming tournaments" />;

    return (
      <div className="h-full flex flex-col">
        <CardHeader registrationLink={items[0].registration_form_link} />
        <UpcomingTournamentCarousel items={items} />
      </div>
    );
  } catch (error) {
    console.error("Error in UpcomingTournamentCardServer:", error);
    return <EmptyState label="Error loading tournament" />;
  }
}
