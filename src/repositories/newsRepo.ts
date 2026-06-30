import { createAdminClient } from "@/utils/supabase/admin";
import { cache } from "@/utils/cache";
import { aggregateNews } from "@/lib/news/aggregate";
import type { NewsItem } from "@/lib/news/types";

// Data access + refresh orchestration for the home news card.
// News is public, so we use the cookieless service-role client for BOTH read
// and write — this keeps the news read off per-request cookies so the home page
// stays statically regenerable (ISR). Writes bypass RLS by design (ingestion is
// server-only). See .claude/plans/home-news-aggregator-card.md.

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // refresh feeds at most hourly
const STALE_PRUNE_DAYS = 3; // drop items not seen in a feed for this long
const REFRESH_LOCK_KEY = "news:refreshing"; // in-process guard against double refresh
const DEFAULT_LIMIT = 8;

interface NewsRow {
  id: string;
  title: string;
  url: string;
  source_id: string;
  source_name: string;
  region: string;
  icon_file: string;
  snippet: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  fetched_at: string;
  rank_score: number;
}

function rowToItem(r: NewsRow): NewsItem {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    sourceId: r.source_id,
    sourceName: r.source_name,
    region: r.region as NewsItem["region"],
    iconFile: r.icon_file,
    snippet: r.snippet,
    thumbnailUrl: r.thumbnail_url,
    publishedAt: r.published_at,
    fetchedAt: r.fetched_at,
    rankScore: r.rank_score,
  };
}

function itemToRow(i: NewsItem): NewsRow {
  return {
    id: i.id,
    title: i.title,
    url: i.url,
    source_id: i.sourceId,
    source_name: i.sourceName,
    region: i.region,
    icon_file: i.iconFile,
    snippet: i.snippet,
    thumbnail_url: i.thumbnailUrl,
    published_at: i.publishedAt,
    fetched_at: i.fetchedAt,
    rank_score: i.rankScore,
  };
}

/** Top news by rank_score (highest first). Guarantees at least one local/African
 *  story in the returned set (swapped into the last slot if the top N is all
 *  international). Returns [] on any failure. */
export async function getLatestNews(limit = DEFAULT_LIMIT): Promise<NewsItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("news_items")
      .select("*")
      .order("rank_score", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    let items = (data as NewsRow[]).map(rowToItem);

    if (items.length && !items.some((i) => i.region === "local" || i.region === "africa")) {
      const { data: loc } = await supabase
        .from("news_items")
        .select("*")
        .in("region", ["local", "africa"])
        .order("rank_score", { ascending: false })
        .limit(1);
      const localRow = (loc as NewsRow[] | null)?.[0];
      if (localRow) {
        const localItem = rowToItem(localRow);
        if (!items.some((i) => i.id === localItem.id)) {
          items = [...items.slice(0, limit - 1), localItem];
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** Upsert the aggregated batch, then prune items not seen for STALE_PRUNE_DAYS. */
export async function upsertNews(items: NewsItem[]): Promise<void> {
  if (!items.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("news_items")
    .upsert(items.map(itemToRow), { onConflict: "id" });
  if (error) throw error;

  const cutoff = new Date(Date.now() - STALE_PRUNE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("news_items").delete().lt("fetched_at", cutoff);
}

async function getLastRefresh(): Promise<number | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("news_meta").select("last_refresh").eq("id", true).single();
    const ts = (data as { last_refresh: string | null } | null)?.last_refresh;
    return ts ? Date.parse(ts) : null;
  } catch {
    return null;
  }
}

async function setRefreshMeta(status: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("news_meta")
    .update({ last_refresh: new Date().toISOString(), last_status: status })
    .eq("id", true);
}

/**
 * Run the aggregator + persist IF the last refresh is older than the interval
 * and no refresh is already in flight on this instance. Safe to call on every
 * page render — it no-ops cheaply when fresh, and never throws.
 */
export async function refreshNewsIfStale(): Promise<void> {
  if (cache.get(REFRESH_LOCK_KEY)) return; // refresh already in flight here
  const last = await getLastRefresh();
  if (last !== null && Date.now() - last < REFRESH_INTERVAL_MS) return; // still fresh

  cache.set(REFRESH_LOCK_KEY, true, 120); // hold the lock up to 2 min
  try {
    const items = await aggregateNews();
    if (items.length) {
      await upsertNews(items);
      await setRefreshMeta(`ok:${items.length}`);
    } else {
      // Don't advance last_refresh on a total miss — retry next render.
      await setRefreshMeta("empty");
    }
  } catch (err) {
    console.error("refreshNewsIfStale failed:", err);
  } finally {
    cache.delete(REFRESH_LOCK_KEY);
  }
}
