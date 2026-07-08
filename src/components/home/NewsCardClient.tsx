"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { FALLBACK_ICON } from "@/lib/news/sources";
import type { NewsItem } from "@/lib/news/types";

// Home chess-news card. Mobile-first bento: featured 2×2 lead (rotates through
// the top stories) + 4 thumbnailed subpreviews that collapse to a compact list
// on mobile. Animation is hand-rolled CSS — no embla/framer-motion needed.
// See .claude/plans/home-news-aggregator-card.md.

export const NEWS_HEADING = "From The Chess World";

const SUB_COUNT = 4; // world-news items shown beside/below the pinned partner card

// Partner club — always the featured (big) card in this section.
const PCC_URL = "https://polokwanechessclub.co.za/news";

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

/** Source logo as an <img>, with a graceful fallback to the generic logo.
 *  Transparent (no box/border) so it blends into whatever sits behind it. */
function LogoImg({ item, className }: { item: NewsItem; className?: string }) {
  const [src, setSrc] = useState(`/news-logos/${item.iconFile}`);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setSrc(`/news-logos/${FALLBACK_ICON}`)}
      className={className}
    />
  );
}

/** Article thumbnail. Real feed image fills the box (object-cover). With no
 *  image we fall back to the source's logo, contained + transparent (no box, no
 *  border) so the logo's surrounding space blends into the card/page behind it. */
function Thumb({ item }: { item: NewsItem }) {
  if (item.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.thumbnailUrl} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
    );
  }
  return <LogoImg item={item} className="h-full w-full object-contain p-2 md:p-5" />;
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

/** Pinned featured card — the Polokwane Chess Club partner card always occupies
 *  the big slot. Logo swaps by theme (transparent PNGs, no box): black wordmark
 *  on light, light wordmark on dark. Links to the club's news/blog page. */
function PccFeatured() {
  return (
    <a
      href={PCC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative md:col-span-2 lg:row-span-2 min-h-[200px] lg:min-h-[300px] overflow-hidden rounded border border-border bg-card flex flex-col justify-end p-4 sm:p-5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-card" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/partners/pcc-logo.png"
        alt="Polokwane Chess Club"
        className="pointer-events-none absolute left-1/2 top-[36%] h-24 w-auto -translate-x-1/2 -translate-y-1/2 object-contain block dark:hidden sm:h-32"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/partners/pcc-logo-dark.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[36%] h-24 w-auto -translate-x-1/2 -translate-y-1/2 object-contain hidden dark:block sm:h-32"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <div className="relative space-y-2">
        <span className="text-[11px] text-muted-foreground">Est. 1958</span>
        <h3 className="text-base sm:text-lg lg:text-xl font-extrabold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
          Polokwane Chess Club
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 lg:line-clamp-3">
          Latest news, results &amp; upcoming tournaments from the club.
        </p>
      </div>
    </a>
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

  const subs = items.slice(0, SUB_COUNT);

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
        {NEWS_HEADING}
      </h2>

      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-4">
        <PccFeatured />
        {subs.map((item, idx) => (
          <Sub key={item.id} item={item} index={idx} mounted={mounted} />
        ))}
      </div>
    </section>
  );
}
