import type { NewsSource } from "./types";

// Verified chess news sources (URLs checked 2026-06-29). RSS/Atom first;
// scrape is the fallback for sources with no feed. Region weighting (see
// aggregate.ts) boosts local/African sources so they surface above the
// higher-volume international feeds. See .claude/plans/home-news-aggregator-card.md.
//
// `weight` is the per-source multiplier folded into rank_score on top of the
// region multiplier — nudge a noisy/lower-signal source down without dropping it.
// `trusted` skips the chess keyword gate (dedicated chess outlets only).

export const NEWS_SOURCES: NewsSource[] = [
  // ── Local (South Africa) ──────────────────────────────────────────
  {
    id: "chessa",
    name: "Chess South Africa",
    region: "local",
    type: "scrape",
    url: "https://chessa.co.za/news",
    weight: 1.1,
    iconFile: "chessa.png",
    trusted: true,
  },
  {
    id: "chesshub-sa",
    name: "SA Chess Hub",
    region: "local",
    type: "scrape",
    url: "https://chesshub.org.za/",
    weight: 1,
    iconFile: "chesshub.png",
    trusted: true,
  },
  {
    // The SA federation sites have no usable RSS, so we pull SA chess coverage
    // via Google News search. Untrusted → the chess keyword gate filters noise.
    id: "gnews-sa",
    name: "SA Chess News",
    region: "local",
    type: "rss",
    url: "https://news.google.com/rss/search?q=chess%20South%20Africa%20OR%20Limpopo%20chess&hl=en-ZA&gl=ZA&ceid=ZA:en",
    weight: 1,
    iconFile: "chessa.png",
    trusted: false,
  },

  // ── Continental (Africa) ──────────────────────────────────────────
  {
    id: "acc",
    name: "African Chess Confederation",
    region: "africa",
    type: "scrape",
    url: "https://africachessconfederation.com/News/",
    weight: 1.1,
    iconFile: "acc.png",
    trusted: true,
  },
  {
    id: "gnews-africa",
    name: "African Chess News",
    region: "africa",
    type: "rss",
    url: "https://news.google.com/rss/search?q=chess%20Africa%20championship%20OR%20African%20chess&hl=en&gl=ZA&ceid=ZA:en",
    weight: 1,
    iconFile: "acc.png",
    trusted: false,
  },

  // ── International (RSS/Atom) ───────────────────────────────────────
  {
    id: "lichess",
    name: "Lichess Blog",
    region: "intl",
    type: "rss", // Atom — parser auto-detects
    url: "https://lichess.org/blog.atom",
    weight: 1,
    iconFile: "lichess.png",
    trusted: true,
  },
  {
    id: "chesscom",
    name: "Chess.com News",
    region: "intl",
    type: "rss",
    url: "https://www.chess.com/rss/news",
    weight: 1,
    iconFile: "chesscom.png",
    trusted: true,
  },
  {
    id: "chessbase",
    name: "ChessBase News",
    region: "intl",
    type: "rss",
    url: "https://en.chessbase.com/feed",
    weight: 1,
    iconFile: "chessbase.png",
    trusted: true,
  },
  {
    id: "twic",
    name: "The Week in Chess",
    region: "intl",
    type: "rss",
    url: "https://theweekinchess.com/twic-rss-feed",
    weight: 0.95,
    iconFile: "twic.png",
    trusted: true,
  },
  {
    id: "fide",
    name: "FIDE",
    region: "intl",
    type: "rss",
    url: "https://www.fide.com/feed/",
    weight: 1.05, // governing body — slight boost
    iconFile: "fide.png",
    trusted: true,
  },
  {
    id: "uschess",
    name: "US Chess",
    region: "intl",
    type: "rss",
    url: "https://new.uschess.org/feed",
    weight: 0.85, // US-centric — lower for a SA audience
    iconFile: "uschess.png",
    trusted: true,
  },
  {
    id: "chessdom",
    name: "Chessdom",
    region: "intl",
    type: "rss",
    url: "https://www.chessdom.com/feed/",
    weight: 0.9,
    iconFile: "chessdom.png",
    trusted: true,
  },
  {
    id: "susanpolgar",
    name: "Susan Polgar",
    region: "intl",
    type: "rss", // Blogger Atom
    url: "https://susanpolgar.blogspot.com/feeds/posts/default",
    weight: 0.85,
    iconFile: "susanpolgar.png",
    trusted: true,
  },
];

/** Fallback icon when a source's logo is missing. */
export const FALLBACK_ICON = "generic.png";

export const RSS_SOURCES = NEWS_SOURCES.filter((s) => s.type === "rss");
export const SCRAPE_SOURCES = NEWS_SOURCES.filter((s) => s.type === "scrape");
