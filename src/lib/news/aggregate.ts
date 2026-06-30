import { createHash } from "node:crypto";
import { NEWS_SOURCES } from "./sources";
import { fetchFeedSource } from "./fetchFeed";
import type { NewsItem, NewsSource, RawNewsItem, Region } from "./types";

// The aggregator brain: fetch every source → chess keyword gate → dedupe →
// region-weighted recency score → per-source cap → sorted NewsItem[].
// Pure in/out (no DB) so it's independently testable; persistence is Phase 4.
// See .claude/plans/home-news-aggregator-card.md.

/** Region multipliers — boost local/African items above high-volume intl feeds. */
const REGION_MULTIPLIER: Record<Region, number> = { local: 3, africa: 2, intl: 1 };

/** Recency half-life: a story ~3 days old scores ~half a brand-new one. */
const RECENCY_HALFLIFE_HOURS = 72;

/** Max items surfaced from any single source, so no feed dominates. */
const PER_SOURCE_CAP = 2;

/** Chess relevance gate for untrusted/general sources. */
const CHESS_KEYWORDS =
  /\b(chess|fide|grandmaster|\bgm\b|\bim\b|\bwgm\b|elo|checkmate|stalemate|opening|gambit|endgame|tournament|olympiad|candidates|world (?:champion|cup|rapid|blitz)|carlsen|gukesh|nakamura|caruana|ding|nepomniachtchi|pragg|chessboard|pgn|grandmaster)\b/i;

function passesGate(source: NewsSource, item: RawNewsItem): boolean {
  if (source.trusted) return true;
  return CHESS_KEYWORDS.test(`${item.title} ${item.snippet ?? ""}`);
}

/** Strip tracking params + trailing slash + lowercase host for stable dedupe + id. */
function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$)/i.test(k)) u.searchParams.delete(k);
    }
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    let s = u.toString();
    s = s.replace(/\/$/, "");
    return s;
  } catch {
    return raw.trim();
  }
}

/** Normalize a title for fuzzy cross-feed dedupe (same story, different outlet). */
function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashId(canonical: string): string {
  return createHash("sha1").update(canonical).digest("hex").slice(0, 16);
}

/** Exponential recency decay in [0,1]; missing dates sink to a small floor. */
function recencyScore(publishedAt: string | null, now: number): number {
  if (!publishedAt) return 0.15;
  const ageHours = (now - Date.parse(publishedAt)) / 3_600_000;
  if (Number.isNaN(ageHours)) return 0.15;
  if (ageHours < 0) return 1; // future-dated → treat as brand new
  return Math.exp(-ageHours / RECENCY_HALFLIFE_HOURS);
}

/**
 * Fetch all sources, gate, dedupe, score, cap, and return items sorted by
 * rank_score (highest first). Never throws — a failed source contributes [].
 */
export async function aggregateNews(): Promise<NewsItem[]> {
  const now = Date.now();
  const fetchedAt = new Date(now).toISOString();

  const perSource = await Promise.all(
    NEWS_SOURCES.map(async (source) => {
      const raws = await fetchFeedSource(source);
      return { source, raws };
    }),
  );

  const byUrl = new Map<string, NewsItem>();
  const seenTitles = new Set<string>();

  for (const { source, raws } of perSource) {
    for (const raw of raws) {
      if (!passesGate(source, raw)) continue;

      const canonical = canonicalUrl(raw.url);
      const tKey = titleKey(raw.title);
      if (byUrl.has(canonical) || (tKey && seenTitles.has(tKey))) continue;

      const rankScore =
        recencyScore(raw.publishedAt, now) * REGION_MULTIPLIER[source.region] * source.weight;

      byUrl.set(canonical, {
        id: hashId(canonical),
        title: raw.title,
        url: canonical,
        sourceId: source.id,
        sourceName: source.name,
        region: source.region,
        iconFile: source.iconFile,
        snippet: raw.snippet,
        thumbnailUrl: raw.thumbnailUrl,
        publishedAt: raw.publishedAt,
        fetchedAt,
        rankScore,
      });
      if (tKey) seenTitles.add(tKey);
    }
  }

  const sorted = [...byUrl.values()].sort((a, b) => b.rankScore - a.rankScore);

  // Per-source cap: walk highest-first, keep at most PER_SOURCE_CAP per source.
  const counts = new Map<string, number>();
  const capped: NewsItem[] = [];
  for (const item of sorted) {
    const n = counts.get(item.sourceId) ?? 0;
    if (n >= PER_SOURCE_CAP) continue;
    counts.set(item.sourceId, n + 1);
    capped.push(item);
  }
  return capped;
}
