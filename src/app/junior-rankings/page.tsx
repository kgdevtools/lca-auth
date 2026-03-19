"use client";

import * as React from "react";
import Link from "next/link";
import {
  getJuniorRankingsForPeriod,
  getJuniorRankings,
  type JuniorPlayerRanking,
  type TournamentEntry,
} from "./server-actions";
import {
  JuniorSearchFilters,
  type JuniorSearchFiltersState,
} from "./components/JuniorSearchFilters";
import { JuniorRankingsTable } from "./components/JuniorRankingsTable";

type JuniorRankingFilters = JuniorSearchFiltersState;
import { EligibilityModal } from "./components/EligibilityModal";

// Period definitions (same as tournaments)
const PERIODS = [
  {
    label: "1 Oct 2024 - 30 Sept 2025",
    value: "2024-2025",
    start: "2024-10-01",
    end: "2025-09-30",
  },
  {
    label: "1 Oct 2025 - 30 Sept 2026",
    value: "2025-2026",
    start: "2025-10-01",
    end: "2026-09-30",
  },
];

export default function JuniorRankingsPage() {
  const [allData, setAllData] = React.useState<Array<JuniorPlayerRanking>>([]);
  const [data, setData] = React.useState<Array<JuniorPlayerRanking>>([]);
  const [selected, setSelected] = React.useState<JuniorPlayerRanking | null>(
    null,
  );
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Fixed federation options as requested
  const FED_OPTIONS = React.useMemo(
    () => ["LCP", "LMG", "LVT", "LWT", "LSG", "LIM", "CSA", "RSA"],
    [],
  );

  // Junior-specific filter state
  const [filters, setFilters] = React.useState<JuniorRankingFilters>({
    name: "",
    fed: "ALL" as any,
    ageGroup: "ALL" as any,
    gender: "ALL" as any,
    events: "ALL" as any,
    period: "2025-2026" as any,
    eligibilityStatus: "ALL" as any,
  });

  React.useEffect(() => {
    setLoading(true);
    // Default to 2025-2026 period
    getJuniorRankingsForPeriod("2025-2026")
      .then((rows) => {
        setAllData(rows);
        setData(rows);
      })
      .catch((err) => console.error("Error fetching junior rankings data", err))
      .finally(() => setLoading(false));
  }, []);

  // Apply client-side filters
  React.useEffect(() => {
    let rows = [...allData];
    const {
      name = "",
      fed = "ALL",
      gender = "ALL",
      ageGroup = "ALL",
      events = "ALL",
      period = "ALL",
      eligibilityStatus = "ALL",
    } = filters;

    // Name filter
    if (name && name.trim().length > 0) {
      const q = name.trim().toLowerCase();
      rows = rows.filter((p) => {
        const displayName = p.display_name.toLowerCase();
        const reversedName =
          `${p.surname.toLowerCase()} ${p.name.toLowerCase()}`.trim();
        return (
          displayName.includes(q) ||
          reversedName.includes(q) ||
          (p.name_key ?? "").toLowerCase().includes(q) ||
          (p.fed ?? "").toLowerCase().includes(q)
        );
      });
    }

    // Federation filter
    if (fed && fed !== ("ALL" as any)) {
      const want = String(fed);
      if (want === "Limpopo") {
        const LIM_SET = new Set(["LCP", "LMG", "LVT", "LWT", "LSG", "LIM"]);
        rows = rows.filter((p) =>
          LIM_SET.has(String(p.fed ?? "").toUpperCase()),
        );
      } else {
        const wantUp = want.toUpperCase();
        rows = rows.filter((p) => (p.fed ?? "").toUpperCase() === wantUp);
      }
    }

    // Gender filter
    if (gender && gender !== ("ALL" as any)) {
      const want = String(gender).toLowerCase();
      rows = rows.filter((p) => {
        const sex = String(p.sex ?? "").toLowerCase();
        if (want === "male") return sex === "m" || sex === "male";
        if (want === "female") return sex === "f" || sex === "female";
        return true;
      });
    }

    // Age group filter (juniors only)
    if (ageGroup && ageGroup !== ("ALL" as any)) {
      rows = rows.filter((p) => {
        const age = p.age_years;
        if (age == null) return false;

        switch (ageGroup) {
          case "U20":
            return age >= 17 && age <= 19;
          case "U18":
            return age >= 15 && age <= 16;
          case "U16":
            return age >= 13 && age <= 14;
          case "U14":
            return age >= 11 && age <= 12;
          case "U12":
            return age >= 9 && age <= 10;
          case "U10":
            return age >= 7 && age <= 8;
          default:
            return true;
        }
      });
    }

    // Events filter
    if (events && events !== ("ALL" as any)) {
      rows = rows.filter((p) => {
        const filteredTournaments = getFilteredTournaments(
          p.tournaments,
          period,
        );
        const count = filteredTournaments.length;
        switch (events) {
          case "1":
            return count === 1;
          case "2+":
            return count >= 2;
          case "3+":
            return count >= 3;
          case "4+":
            return count >= 4;
          case "5+":
            return count >= 5;
          case "6+":
            return count >= 6;
          default:
            return true;
        }
      });
    }

    // Eligibility status filter
    if (eligibilityStatus && eligibilityStatus !== ("ALL" as any)) {
      rows = rows.filter((p) => {
        if (eligibilityStatus === "ELIGIBLE") {
          return p.cdc_eligibility?.eligible === true;
        } else if (eligibilityStatus === "INELIGIBLE") {
          return p.cdc_eligibility?.eligible === false;
        }
        return true;
      });
    }

    // Sort by CDC score first, then APR
    rows.sort((a: JuniorPlayerRanking, b: JuniorPlayerRanking) => {
      // Eligible players come first
      const aEligible = a.cdc_eligibility?.eligible === true ? 1 : 0;
      const bEligible = b.cdc_eligibility?.eligible === true ? 1 : 0;
      if (aEligible !== bEligible) return bEligible - aEligible;

      // Then by CDC score (if available)
      if (a.cdc_score && b.cdc_score) {
        return b.cdc_score - a.cdc_score;
      } else if (a.cdc_score) {
        return -1;
      } else if (b.cdc_score) {
        return 1;
      }

      // Finally by APR
      const getDisplayAPR = (player: JuniorPlayerRanking) => {
        const filteredTournaments = getFilteredTournaments(
          player.tournaments,
          period,
        );

        const validPerformanceRatings = filteredTournaments
          .map((t) => t.performance_rating)
          .filter(
            (rating): rating is number =>
              rating !== null && rating !== undefined,
          );

        return validPerformanceRatings.length > 0
          ? validPerformanceRatings.reduce((sum, rating) => sum + rating, 0) /
              validPerformanceRatings.length
          : 0;
      };

      return getDisplayAPR(b) - getDisplayAPR(a);
    });

    setData(rows);
  }, [filters, allData]);

  const handleSearch = (next: Partial<JuniorRankingFilters>) => {
    setFilters((prev: JuniorRankingFilters) => ({ ...prev, ...next }));
  };

  // Helper function to filter tournaments by period and check if played
  function getFilteredTournaments(
    tournaments: TournamentEntry[],
    periodValue: string,
  ): TournamentEntry[] {
    // Filter by period if not "ALL"
    let filtered = tournaments;
    if (periodValue && periodValue !== "ALL") {
      const period = PERIODS.find((p) => p.value === periodValue);
      if (period) {
        filtered = tournaments.filter((t) => {
          if (!t.tournament_date) return false;
          const normalizedDate = t.tournament_date.replace(/\//g, "-");
          return normalizedDate >= period.start && normalizedDate <= period.end;
        });
      }
    }

    // Only return tournaments that were actually played (have valid tie breaks)
    return filtered.filter((tournament) => {
      const tieBreaks = tournament.tie_breaks || {};
      const hasValidTieBreaks = Object.values(tieBreaks).some(
        (value) =>
          value !== null && value !== undefined && value !== "" && value !== 0,
      );
      return hasValidTieBreaks && tournament.performance_rating;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 4xl:px-12 5xl:px-16 6xl:px-20">
          <div className="space-y-6">
            {/* Selection Policy Header */}
            <div className="bg-card border-2 border-border rounded-xl p-6 mb-8 shadow-sm">
              <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2 uppercase">
                Limpopo Junior Qualifying Rankings
              </h1>
              <p className="text-sm font-bold text-primary mb-6 tracking-wide uppercase">
                CDC SELECTION POLICY, 2025-2026
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    01. The Requirement
                  </h3>
                  <p className="text-sm leading-relaxed">
                    <strong>6 tournaments total</strong>. Minimum 4 Junior
                    Qualifiers + 2 Open Tournaments, OR 3 Junior Qualifiers + 3
                    Open Tournaments.
                  </p>
                </div>
                <div className="space-y-2 border-l border-border pl-6">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    02. "Open" Criteria
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Must meet avg rating of <strong>1200 (U8-U12)</strong> or{" "}
                    <strong>1400 (U14-U20)</strong>. One Open tournament{" "}
                    <strong>must</strong> be played in Capricorn District.
                  </p>
                </div>
                <div className="space-y-2 border-l border-border pl-6">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    03. Restrictions
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Only CDC-run Junior Qualifiers count. External district
                    qualifiers are excluded. National (SA Open/JCCC) and
                    Provincial (Limpopo Open) events are recognized.
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky top-0 z-10 bg-background px-4 py-2 -my-2">
              <JuniorSearchFilters
                onSearch={handleSearch}
                fedOptions={FED_OPTIONS}
                initialState={filters}
              />
            </div>

            <JuniorRankingsTable
              data={data}
              loading={loading}
              period={filters.period ?? "ALL"}
              onSelectPlayer={(p) => {
                setSelected(p);
                setOpen(true);
              }}
            />

            <EligibilityModal
              player={selected}
              open={open}
              period={filters.period ?? "ALL"}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
