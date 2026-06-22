"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UpcomingTournament } from "@/types/upcoming-tournament";

const CURRENT_MS = 15000; // first slide ("current") dwells longer
const OTHER_MS = 5000;

function isPast(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return Number.isFinite(d) && d < Date.now();
}

function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

/** Whole poster shown (contain) over a blurred copy that fills the card. */
function PosterFill({ url, name }: { url: string; name: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl opacity-50" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="relative z-10 h-full w-full object-contain" loading="eager" />
    </div>
  );
}

function DataLayout({ t }: { t: UpcomingTournament }) {
  const date = formatDate(t.tournament_date);
  return (
    <div className="h-full w-full bg-card p-4 space-y-2 flex flex-col justify-center">
      <h3 className="text-base sm:text-lg font-extrabold leading-snug text-foreground line-clamp-3">{t.tournament_name}</h3>
      {date && <p className="text-sm font-semibold text-primary">{date}</p>}
      {t.location && <p className="text-sm text-foreground/80">📍 {t.location}</p>}
      {t.organizer_contact && <p className="text-sm text-foreground/70">📞 {t.organizer_contact}</p>}
      {t.organizer_name && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/60">Organiser:</span> {t.organizer_name}
        </p>
      )}
      {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
    </div>
  );
}

function Slide({ t }: { t: UpcomingTournament }) {
  const href = t.registration_form_link?.trim() || null;
  const past = isPast(t.tournament_date);
  const inner = (
    <div className="relative h-full w-full">
      {t.poster_url?.trim()
        ? <PosterFill url={t.poster_url} name={t.tournament_name} />
        : <DataLayout t={t} />}
      <span className="absolute top-2 left-2 z-20 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-background/80 text-foreground backdrop-blur">
        {past ? "Completed" : "Upcoming"}
      </span>
    </div>
  );
  // Clickable only when a registration link exists; opens in a new tab.
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">{inner}</a>
  ) : (
    <div className="h-full w-full cursor-default">{inner}</div>
  );
}

export function UpcomingTournamentCarousel({ items }: { items: UpcomingTournament[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const dwell = i === 0 ? CURRENT_MS : OTHER_MS;
    const id = setTimeout(() => setI((x) => (x + 1) % n), dwell);
    return () => clearTimeout(id);
  }, [i, n, paused]);

  const go = (dir: number) => setI((x) => (x + dir + n) % n);

  return (
    <div
      className="relative flex-1 min-h-[360px] overflow-hidden rounded border border-border bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {items.map((t) => (
          <div key={t.id} className="h-full w-full flex-none">
            <Slide t={t} />
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button
            aria-label="Previous tournament"
            onClick={() => go(-1)}
            className="absolute left-1.5 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/50 text-foreground/70 opacity-60 backdrop-blur-sm transition hover:bg-background/80 hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Next tournament"
            onClick={() => go(1)}
            className="absolute right-1.5 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-background/50 text-foreground/70 opacity-60 backdrop-blur-sm transition hover:bg-background/80 hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {n > 1 && (
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Show tournament ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
