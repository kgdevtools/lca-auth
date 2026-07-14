import type { RankedSummary } from "@/lib/rankings";
import { juniorCriteria, seniorCriteria } from "@/lib/cdcSelection";
import { JUNIOR_MIN_BIRTH } from "@/lib/ageGroups";

// Chess-season start year for the home page: 2025 = Oct 2025–Sep 2026.
export const SEASON = 2025;
export const SEASON_LABEL = "2025–2026";

// Limpopo grouping — any of the local-union federation codes.
const LIM_CODES = new Set(["LCP", "LMG", "LSG", "LVT", "CSA", "LWT", "LIM"]);

// Junior = turns at most 19 this calendar year (shared convention: U20 is the
// top junior band, covering players turning 18/19).
export const isJunior = (p: RankedSummary) =>
  p.birthYear != null && p.birthYear >= JUNIOR_MIN_BIRTH;

// "Local" = played a Limpopo event OR ever held a local federation code, so
// non-Limpopo-coded players who turned up at our tournaments are included.
export const isLocal = (p: RankedSummary) =>
  p.playedLimpopo || p.federations.some((c) => LIM_CODES.has(c.toUpperCase()));

// CDC qualification verdict for the season, by the player's cohort.
export const meetsCriteria = (p: RankedSummary) => {
  const counts = {
    junior: p.juniorTournaments,
    open: p.openTournaments,
    capricorn: p.capricornTournaments,
    hasCapricornOpen: p.hasCapricornOpen,
  };
  return (isJunior(p) ? juniorCriteria(counts) : seniorCriteria(counts)).meets;
};

/** One pared-down row for the home rankings card (keeps the client payload small). */
export interface CardRow {
  key: string;
  name: string;
  fed: string | null;
  rating: number | null;
  events: number;
  /** The headline figure for the active category (APR or wins). */
  value: number | null;
  qualified: boolean;
}

export interface CardCategory {
  id: string;
  label: string;
  metric: "APR" | "Wins";
  rows: CardRow[];
}

const toRow = (p: RankedSummary, value: number | null): CardRow => ({
  key: p.key,
  name: p.name,
  fed: p.federation ?? null,
  rating: p.currentRating ?? p.fideRating ?? null,
  events: p.ratedTournaments || 0,
  value,
  qualified: meetsCriteria(p),
});

/** The card's category tabs — stable order, "Qualified Juniors" first as default. */
export function buildCategories(local: RankedSummary[]): CardCategory[] {
  const byApr = (a: RankedSummary, b: RankedSummary) => b.avgPerf - a.avgPerf;
  const topApr = (list: RankedSummary[]) =>
    list.filter((p) => p.avgPerf).sort(byApr).slice(0, 10).map((p) => toRow(p, Math.round(p.avgPerf)));

  const cats: CardCategory[] = [
    { id: "juniors", label: "Qualified Juniors", metric: "APR", rows: topApr(local.filter((p) => isJunior(p) && meetsCriteria(p))) },
    { id: "open", label: "Open", metric: "APR", rows: topApr(local) },
    { id: "men", label: "Men", metric: "APR", rows: topApr(local.filter((p) => (p.sex ?? "").toUpperCase() === "M")) },
    { id: "women", label: "Women", metric: "APR", rows: topApr(local.filter((p) => (p.sex ?? "").toUpperCase() === "F")) },
    {
      id: "wins",
      label: "Most Wins",
      metric: "Wins",
      rows: local
        .filter((p) => p.wins > 0)
        .sort((a, b) => b.wins - a.wins || byApr(a, b))
        .slice(0, 10)
        .map((p) => toRow(p, p.wins)),
    },
  ];
  return cats.filter((c) => c.rows.length > 0);
}
