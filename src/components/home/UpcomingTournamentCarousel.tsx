"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { UpcomingTournament } from "@/types/upcoming-tournament";

const DWELL_MS = 5000; // uniform dwell per slide

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
      <span className="absolute top-6 left-2 z-20 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-background/80 text-foreground backdrop-blur">
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

/** True when the OS asks for reduced motion — the fill animation (and its
 *  animationend event) is disabled then, so a plain timer drives the rotation. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** WhatsApp-status style segment row: past segments full, the active one fills
 *  left→right over the dwell and advances the carousel when its animation ends. */
function StorySegments({
  n, i, paused, reduced, onSelect, onDone,
}: {
  n: number; i: number; paused: boolean; reduced: boolean;
  onSelect: (idx: number) => void; onDone: () => void;
}) {
  return (
    <div className="absolute top-2 left-2 right-2 z-20 flex gap-1.5">
      {Array.from({ length: n }, (_, idx) => (
        <button
          key={idx}
          aria-label={`Show tournament ${idx + 1}`}
          onClick={() => onSelect(idx)}
          className="h-1 flex-1 overflow-hidden rounded-full bg-white/35 backdrop-blur-[1px]"
        >
          {idx === i ? (
            <div
              // remount per activation so the fill restarts from zero
              key={`run-${i}`}
              onAnimationEnd={onDone}
              className="h-full w-full origin-left rounded-full bg-white"
              style={
                reduced
                  ? undefined // static full bar; a timer advances the slide instead
                  : {
                      animation: `story-fill ${DWELL_MS}ms linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                    }
              }
            />
          ) : (
            <div className={`h-full w-full rounded-full bg-white transition-none ${idx < i ? "" : "scale-x-0"}`} />
          )}
        </button>
      ))}
    </div>
  );
}

export function UpcomingTournamentCarousel({ items }: { items: UpcomingTournament[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const n = items.length;

  const next = () => setI((x) => (x + 1) % n);
  const go = (dir: number) => setI((x) => (x + dir + n) % n);

  // Reduced-motion fallback: no animation → no animationend → plain timer.
  useEffect(() => {
    if (!reduced || n <= 1 || paused) return;
    const id = setTimeout(next, DWELL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, i, n, paused]);

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
          {/* top scrim so the white segments read on any poster/card */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-12 bg-gradient-to-b from-black/45 to-transparent" />
          <StorySegments n={n} i={i} paused={paused} reduced={reduced} onSelect={setI} onDone={next} />

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
    </div>
  );
}
