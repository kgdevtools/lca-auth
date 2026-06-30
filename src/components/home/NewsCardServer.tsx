import { getLatestNews, refreshNewsIfStale } from "@/repositories/newsRepo";
import { NewsCardClient, NEWS_HEADING } from "./NewsCardClient";

// Server entry for the home news card. Reads persisted items (fast) and triggers
// a guarded feed refresh when stale — on an ISR page this runs during background
// regeneration, never blocking the live request. Fails soft to an empty state.
// See .claude/plans/home-news-aggregator-card.md.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">{NEWS_HEADING}</h2>
      <div className="rounded border border-border bg-card flex items-center justify-center min-h-[160px]">
        {children}
      </div>
    </section>
  );
}

export async function NewsCardServer() {
  try {
    await refreshNewsIfStale();
    // Lead cycles 3 + 4 subs = 7 visible; fetch exactly that so the guaranteed
    // local/African item lands in the shown set.
    const items = await getLatestNews(7);
    if (!items.length) {
      return <Shell><p className="text-sm text-muted-foreground">No chess news right now</p></Shell>;
    }
    return <NewsCardClient items={items} />;
  } catch (error) {
    console.error("Error in NewsCardServer:", error);
    return <Shell><p className="text-sm text-muted-foreground">Unable to load chess news</p></Shell>;
  }
}
