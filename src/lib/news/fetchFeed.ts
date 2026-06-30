import * as cheerio from "cheerio";
import type { NewsSource, RawNewsItem } from "./types";

// Fetches + parses a single feed source into RawNewsItem[]. RSS 2.0 and Atom
// are both handled via cheerio in xmlMode (no new dependency). Every source is
// isolated: any network/parse failure returns [] so one dead feed never breaks
// the aggregate. Scraping lives in Phase 6 — scrape sources return [] for now.
// See .claude/plans/home-news-aggregator-card.md.

const USER_AGENT =
  "LimpopoChessAcademyBot/1.0 (+https://limpopochessacademy.co.za; news aggregator)";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_ITEMS_PER_SOURCE = 15;
const SNIPPET_MAX = 200;

/** GET with a real UA + hard timeout. Returns the body text, or null on failure. */
async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
      // Server-side only; never serve a request off stale feed bytes by accident.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Collapse whitespace, strip tags, decode entities, cap length. */
function cleanSnippet(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // raw may contain HTML (RSS descriptions often do) — parse + take text.
  const text = cheerio.load(`<x>${raw}</x>`)("x").text().replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= SNIPPET_MAX) return text;
  // Cut at the last word boundary within the limit.
  const cut = text.slice(0, SNIPPET_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/** Parse a date string to ISO, or null if unparseable. */
function toISO(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** First non-empty attribute value among the given selectors, scoped to $el. */
function firstAttr($el: cheerio.Cheerio<any>, selectors: string[], attr: string): string | null {
  for (const sel of selectors) {
    const v = $el.find(sel).first().attr(attr);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/** First <img src> embedded in an HTML blob (RSS description / content:encoded),
 *  used as a thumbnail fallback when the feed has no media:/enclosure tag. */
function firstImg(html: string | undefined | null): string | null {
  if (!html || !html.includes("<img")) return null;
  const src = cheerio.load(`<x>${html}</x>`)("img").first().attr("src");
  return src && src.trim() ? src.trim() : null;
}

/** RSS 2.0: <channel><item>… */
function parseRss($: cheerio.CheerioAPI): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  $("item").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").first().text().trim();
    const url = $el.find("link").first().text().trim() || $el.find("guid").first().text().trim();
    if (!title || !url) return;
    const description = $el.find("description").first().text();
    const contentEncoded = $el.find("content\\:encoded").first().text();
    items.push({
      title,
      url,
      snippet: cleanSnippet(description),
      thumbnailUrl:
        firstAttr($el, ["media\\:content", "media\\:thumbnail", "enclosure[type^='image']", "enclosure"], "url") ||
        firstImg(contentEncoded) ||
        firstImg(description),
      publishedAt: toISO($el.find("pubDate").first().text() || $el.find("dc\\:date").first().text()),
    });
  });
  return items;
}

/** Atom: <feed><entry>… */
function parseAtom($: cheerio.CheerioAPI): RawNewsItem[] {
  const items: RawNewsItem[] = [];
  $("entry").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").first().text().trim();
    // Prefer rel="alternate" link, else the first link with an href.
    const url =
      $el.find("link[rel='alternate']").first().attr("href") ||
      $el.find("link[href]").first().attr("href") ||
      "";
    if (!title || !url) return;
    const summary = $el.find("summary").first().text() || $el.find("content").first().text();
    items.push({
      title,
      url: url.trim(),
      snippet: cleanSnippet(summary),
      thumbnailUrl: firstAttr($el, ["media\\:thumbnail", "media\\:content"], "url") || firstImg(summary),
      publishedAt: toISO($el.find("published").first().text() || $el.find("updated").first().text()),
    });
  });
  return items;
}

/**
 * Fetch + parse one feed source. Auto-detects RSS vs Atom. Returns at most
 * MAX_ITEMS_PER_SOURCE newest-as-given items. Never throws.
 */
export async function fetchFeedSource(source: NewsSource): Promise<RawNewsItem[]> {
  if (source.type !== "rss") return []; // scrapers arrive in Phase 6
  const body = await fetchText(source.url);
  if (!body) return [];
  try {
    const $ = cheerio.load(body, { xmlMode: true });
    const items = $("entry").length > 0 ? parseAtom($) : parseRss($);
    return items.slice(0, MAX_ITEMS_PER_SOURCE);
  } catch {
    return [];
  }
}
