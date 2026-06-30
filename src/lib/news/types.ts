// Chess news aggregator — normalized shapes shared across ingestion + UI.
// We aggregate POINTERS only (title/source/date/snippet/link), never article
// bodies. See .claude/plans/home-news-aggregator-card.md.

/** Where a source sits geographically — drives region weighting + tabs. */
export type Region = "local" | "africa" | "intl";

/** How a source is ingested. RSS/Atom first; scrape is the fallback. */
export type SourceType = "rss" | "scrape";

/** A registered news source (src/lib/news/sources.ts). */
export interface NewsSource {
  id: string;          // stable slug, also the source_id stored on items
  name: string;        // display name ("ChessBase News")
  region: Region;
  type: SourceType;
  url: string;         // feed URL (rss) or page URL (scrape)
  weight: number;      // region/quality multiplier feeding rank_score
  iconFile: string;    // file under public/news-logos/ (e.g. "chessbase.svg")
  /** Skip the chess keyword gate for dedicated chess feeds + first-party. */
  trusted?: boolean;
}

/** One normalized story — maps 1:1 onto the news_items table. */
export interface NewsItem {
  id: string;                 // hash of canonical url
  title: string;
  url: string;                // canonical link (dedupe key)
  sourceId: string;
  sourceName: string;
  region: Region;
  iconFile: string;
  snippet: string | null;     // <=200 chars, feed-supplied
  thumbnailUrl: string | null;
  publishedAt: string | null; // ISO; falls back to fetchedAt when absent
  fetchedAt: string;          // ISO
  rankScore: number;          // recency × region weight
}

/** Raw item straight off a feed/scrape, before gating/dedupe/scoring. */
export interface RawNewsItem {
  title: string;
  url: string;
  snippet: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}
