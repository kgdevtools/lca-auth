"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { FALLBACK_ICON } from "@/lib/news/sources";
import type { NewsItem, Region } from "@/lib/news/types";

// Home chess-news card. Mobile-first bento: featured 2×2 lead (rotates through
// the top stories) + 4 thumbnailed subpreviews that collapse to a compact list
// on mobile. Animation is hand-rolled CSS — no embla/framer-motion needed.
// See .claude/plans/home-news-aggregator-card.md.

export const NEWS_HEADING = "From The Chess World";

const LEAD_COUNT = 3; // top stories cycled in the featured slot
const SUB_COUNT = 4; // smaller items beside/below the lead (5 cards total)
const LEAD_DWELL_MS = 6000;

const REGION_LABEL: Record<Region, string> = { local: "Local", africa: "Africa", intl: "World" };

function relTime(item: NewsItem): string {
  const iso = item.publishedAt ?? item.fetchedAt;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return formatDistanceToNowStrict(new Date(t), { addSuffix: true });
}

/** Source favicon with a graceful fallback to the generic icon. */
function SourceIcon({ item, className }: { item: NewsItem; className?: string }) {
  const [src, setSrc] = useState(`/news-logos/${item.iconFile}`);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.sourceName}
      width={20}
      height={20}
      loading="lazy"
      onError={() => setSrc(`/news-logos/${FALLBACK_ICON}`)}
      className={className ?? "h-4 w-4 rounded-sm object-contain"}
    />
  );
}

/** Article thumbnail. Real feed image fills the box (object-cover). With no
 *  image we fall back to the source's logo, contained + transparent (no box, no
 *  border) so the logo's surrounding space blends into the card/page behind it. */
function Thumb({ item }: { item: NewsItem }) {
  const [logoSrc, setLogoSrc] = useState(`/news-logos/${item.iconFile}`);
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.thumbnailUrl} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setLogoSrc(`/news-logos/${FALLBACK_ICON}`)}
      className="h-full w-full object-contain p-2 md:p-5"
    />
  );
}

function RegionTag({ region }: { region: Region }) {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
      {REGION_LABEL[region]}
    </span>
  );
}

function Meta({ item }: { item: NewsItem }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
      <SourceIcon item={item} />
      <span className="font-semibold text-foreground/80 truncate">{item.sourceName}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums whitespace-nowrap">{relTime(item)}</span>
    </div>
  );
}

/** Featured lead — large, cross-fades through the top LEAD_COUNT stories. */
function Lead({ items }: { items: NewsItem[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const id = setTimeout(() => setI((x) => (x + 1) % n), LEAD_DWELL_MS);
    return () => clearTimeout(id);
  }, [i, n, paused]);

  return (
    <div
      className="group relative md:col-span-2 lg:row-span-2 min-h-[200px] lg:min-h-[300px] overflow-hidden rounded border border-border bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {items.map((item, idx) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-hidden={idx !== i}
          tabIndex={idx === i ? 0 : -1}
          className={`absolute inset-0 flex flex-col justify-end p-4 sm:p-5 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
            idx === i ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {item.thumbnailUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnailUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-card" />
          )}
          <div className="relative space-y-2">
            <div className="flex items-center gap-2">
              <RegionTag region={item.region} />
              <Meta item={item} />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-extrabold leading-snug tracking-tight text-foreground line-clamp-3 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            {item.snippet && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 lg:line-clamp-3">
                {item.snippet}
              </p>
            )}
          </div>
        </a>
      ))}

      {n > 1 && (
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Show featured story ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Subpreview — compact thumbnailed list row on mobile, card on md+. */
function Sub({ item, index, mounted }: { item: NewsItem; index: number; mounted: boolean }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ transitionDelay: `${index * 60}ms` }}
      className={`group flex items-center gap-2 border-b border-border py-1.5 transition-all duration-500 ease-out motion-reduce:transition-none md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded md:border md:bg-card md:py-0 md:hover:border-muted-foreground/50 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="order-1 h-12 w-12 shrink-0 overflow-hidden rounded md:order-none md:h-24 md:w-full md:rounded-none">
        <Thumb item={item} />
      </div>
      <div className="order-2 min-w-0 flex-1 md:p-2.5">
        <h4 className="text-[13px] sm:text-sm font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <div className="mt-1">
          <Meta item={item} />
        </div>
      </div>
    </a>
  );
}

export function NewsCardClient({ items }: { items: NewsItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const leads = items.slice(0, LEAD_COUNT);
  const subs = items.slice(LEAD_COUNT, LEAD_COUNT + SUB_COUNT);

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
        {NEWS_HEADING}
      </h2>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-4">
        {leads.length > 0 && <Lead items={leads} />}
        {subs.map((item, idx) => (
          <Sub key={item.id} item={item} index={idx} mounted={mounted} />
        ))}
      </div>
    </section>
  );
}
