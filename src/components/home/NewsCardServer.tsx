import { getLatestNews, refreshNewsIfStale } from "@/repositories/newsRepo";
import { NewsCardClient } from "./NewsCardClient";

// Server entry for the home news section. The Polokwane Chess Club partner card
// is the pinned featured card (rendered client-side), so the section always
// shows even when the world-news feed is empty or erroring — we just fetch the
// smaller sub-cards here and fail soft to no subs. See NewsCardClient.
// See .claude/plans/home-news-aggregator-card.md.

export async function NewsCardServer() {
  let items: Awaited<ReturnType<typeof getLatestNews>> = [];
  try {
    await refreshNewsIfStale();
    items = await getLatestNews(6);
  } catch (error) {
    console.error("Error in NewsCardServer:", error);
  }
  return <NewsCardClient items={items} />;
}
