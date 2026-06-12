import { getSummaries } from "@/lib/rankingsServer";
import Link from "next/link";
import { RankingsCardClient } from "./RankingsCardClient";
import { SEASON, SEASON_LABEL, isLocal, buildCategories } from "./homeRankings";

export async function RankingsCardServer() {
  try {
    // Player-rankings aggregation for the season (module-cached server-side).
    const allRankings = await getSummaries(SEASON);
    const local = allRankings.filter(isLocal);
    const categories = buildCategories(local);

    if (categories.length === 0) {
      return (
        <div className="rounded border border-border bg-card flex flex-col p-6 min-h-[300px]">
          <h2 className="text-lg font-bold mb-4 text-primary">Current Rankings</h2>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No rankings available</p>
          </div>
        </div>
      );
    }

    return <RankingsCardClient categories={categories} seasonLabel={SEASON_LABEL} />;
  } catch (error) {
    console.error("Error in RankingsCardServer:", error);
    return (
      <div className="rounded border border-border bg-card flex flex-col p-6 min-h-[300px]">
        <h2 className="text-lg font-bold mb-4 text-primary">Current Rankings</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-muted-foreground text-sm">Error loading rankings</p>
            <Link href="/player-rankings" className="mt-2 text-primary hover:underline text-sm">
              Try again
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
