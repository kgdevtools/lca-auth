"use server";

import { createClient } from "@/utils/supabase/server";

export interface CDCTournamentClassification {
  id?: string;
  tournament_id: string;
  classification_type: "JUNIOR_QUALIFYING" | "OPEN" | "OTHER";
  is_cdc_accredited: boolean;
  is_capricorn_district: boolean;
  meets_rating_requirement: boolean;
  average_top_rating: number | null;
  field_size: number | null;
  min_rating_threshold: number | null;
  age_groups: string[];
  admin_notes: string | null;
}

export interface TournamentEntry {
  raw_name: string;
  tournament_id: string | null;
  tournament_name: string | null;
  tournament_date: string | null;
  player_rating: number | null;
  performance_rating: number | null;
  rank: number | null; // Added to interface
  confidence: string | null;
  tie_breaks: Record<string, number | string>;
  classifications: Record<string, string>;
  created_at: string | null;
  cdc_classification?: CDCTournamentClassification;
}

export interface JuniorEligibility {
  eligible: boolean;
  totalTournaments: number;
  juniorQualifyingTournaments: number;
  openTournamentsThatCount: number;
  capricornOpenTournaments: number;
  requirement: "SIX_TOTAL" | "THREE_PLUS_THREE" | "NONE";
  warnings: string[];
  recentRanks: number[];
}

export interface JuniorPlayerRanking {
  name_key: string;
  display_name: string;
  name: string;
  surname: string;
  rating: number | null;
  fed: string | null;
  avg_performance_rating: number | null;
  tournaments_count: number;
  tournaments: TournamentEntry[];
  bdate_raw: string | null;
  age_years: number | null;
  age_group: string | null;
  sex: string | null;
  cdc_eligibility: JuniorEligibility | null;
  cdc_score: number | null;
}

// Helper functions (kept exactly as per your original logic)
function safeNumber(v: any): number | null {
  const n = typeof v === "number" ? v : v == null ? NaN : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function tryParseJSON<T = any>(v: any, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
}

function normalizeUniqueNo(v: any): string {
  return String(v ?? "").trim();
}

function parseBirthDate(raw: any): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return new Date(n);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
}

function computeAgeYears(bdateRaw: any): number | null {
  const d = parseBirthDate(bdateRaw);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function deriveJuniorAgeGroup(age: number | null): string | null {
  if (age == null) return null;
  if (age >= 17 && age <= 19) return "U20";
  if (age >= 15 && age <= 16) return "U18";
  if (age >= 13 && age <= 14) return "U16";
  if (age >= 11 && age <= 12) return "U14";
  if (age >= 9 && age <= 10) return "U12";
  if (age >= 7 && age <= 8) return "U10";
  return null;
}

function isJuniorAgeGroup(ageGroup: string | null): boolean {
  return ["U10", "U12", "U14", "U16", "U18", "U20"].includes(ageGroup || "");
}

// Eligibility and Score Logic
function calculateJuniorEligibility(
  tournaments: TournamentEntry[],
  ageGroup: string | null,
): JuniorEligibility | null {
  if (!isJuniorAgeGroup(ageGroup)) return null;

  const classified = tournaments.filter((t) => t.cdc_classification);
  const juniorQualifying = classified.filter(
    (t) => t.cdc_classification?.classification_type === "JUNIOR_QUALIFYING",
  );
  const openTournaments = classified.filter(
    (t) =>
      t.cdc_classification?.classification_type === "OPEN" &&
      t.cdc_classification?.meets_rating_requirement,
  );
  const capricornOpen = openTournaments.filter(
    (t) => t.cdc_classification?.is_capricorn_district,
  );

  const total = juniorQualifying.length + openTournaments.length;
  const hasCap = capricornOpen.length >= 1;
  const path1 = total >= 6 && openTournaments.length >= 2 && hasCap;
  const path2 =
    juniorQualifying.length >= 3 && openTournaments.length >= 3 && hasCap;

  const eligible = path1 || path2;
  const recentRanks: number[] = tournaments
    .slice(-5)
    .map((t) => t.rank)
    .filter((rank): rank is number => rank !== null && rank !== undefined);

  return {
    eligible,
    totalTournaments: total,
    juniorQualifyingTournaments: juniorQualifying.length,
    openTournamentsThatCount: openTournaments.length,
    capricornOpenTournaments: capricornOpen.length,
    requirement: path2 ? "THREE_PLUS_THREE" : path1 ? "SIX_TOTAL" : "NONE",
    warnings: [],
    recentRanks,
  };
}

function calculateCDCScore(
  eligibility: JuniorEligibility | null,
  avgPerf: number | null,
): number | null {
  if (!eligibility || !eligibility.eligible) return null;
  let score =
    (avgPerf || 0) +
    eligibility.totalTournaments * 10 +
    eligibility.capricornOpenTournaments * 50;
  if (eligibility.totalTournaments > 6)
    score += (eligibility.totalTournaments - 6) * 20;
  return score;
}

export async function getJuniorRankings(): Promise<JuniorPlayerRanking[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("active_players_august_2025_profiles")
    .select("*");
  if (error) return [];

  const { data: classifData } = await supabase
    .from("junior_tournament_classifications")
    .select("*");
  const cdcMap = new Map();
  classifData?.forEach((c: any) => cdcMap.set(c.tournament_id, c));

  const tournamentIds = Array.from(
    new Set(rows.map((r) => r.tournament_id).filter((id) => !!id)),
  );
  const playerNames = Array.from(
    new Set(rows.map((r) => r.name).filter((n) => !!n)),
  );

  const dateMap = new Map();
  const { data: tDates } = await supabase
    .from("tournaments")
    .select("id, date")
    .in("id", tournamentIds);
  tDates?.forEach((t: any) => dateMap.set(t.id, t.date));

  // Fetching ranks from the players table
  const standingsMap = new Map();
  const { data: rankData } = await supabase
    .from("players")
    .select("tournament_id, name, rank")
    .in("tournament_id", tournamentIds)
    .in("name", playerNames);
  rankData?.forEach((p: any) =>
    standingsMap.set(`${p.tournament_id}-${p.name}`, p.rank),
  );

  const groups = new Map();
  rows.forEach((r) => {
    const key = normalizeUniqueNo(r.UNIQUE_NO);
    if (!key) return;
    const arr = groups.get(key) || [];
    arr.push(r);
    groups.set(key, arr);
  });

  const players: JuniorPlayerRanking[] = Array.from(groups.keys())
    .map((key) => {
      const gr = groups.get(key);
      const latestRow = gr.sort(
        (a: any, b: any) => Date.parse(b.created_at) - Date.parse(a.created_at),
      )[0];

      const tournaments: TournamentEntry[] = gr
        .map((r: any) => ({
          raw_name: String(r.name ?? ""),
          tournament_id: r.tournament_id,
          tournament_name: r.tournament_name,
          tournament_date: dateMap.get(r.tournament_id) ?? null,
          player_rating: safeNumber(r.player_rating) ?? safeNumber(r.RATING),
          performance_rating: safeNumber(r.performance_rating) ?? 0,
          rank: standingsMap.get(`${r.tournament_id}-${r.name}`) ?? null, // Fixed: Populating rank
          confidence: r.confidence,
          tie_breaks: tryParseJSON(r.tie_breaks, {}),
          classifications: tryParseJSON(r.classifications, {}),
          created_at: r.created_at,
          cdc_classification: cdcMap.get(r.tournament_id),
        }))
        .sort(
          (a: any, b: any) =>
            Date.parse(b.created_at) - Date.parse(a.created_at),
        );

      const ageGroup = deriveJuniorAgeGroup(computeAgeYears(latestRow.BDATE));
      if (!isJuniorAgeGroup(ageGroup)) return null;

      const avgPerf = Number(
        (
          tournaments.reduce((s, t) => s + (t.performance_rating || 0), 0) /
          (tournaments.length || 1)
        ).toFixed(2),
      );
      const eligibility = calculateJuniorEligibility(tournaments, ageGroup);

      return {
        name_key: key,
        display_name: `${latestRow.FIRSTNAME} ${latestRow.SURNAME}`.trim(),
        name: latestRow.FIRSTNAME,
        surname: latestRow.SURNAME,
        rating: tournaments[0]?.player_rating ?? safeNumber(latestRow.RATING),
        fed: latestRow.FED,
        avg_performance_rating: avgPerf,
        tournaments_count: tournaments.length,
        tournaments,
        bdate_raw: latestRow.BDATE,
        age_years: computeAgeYears(latestRow.BDATE),
        age_group: ageGroup,
        sex: latestRow.SEX,
        cdc_eligibility: eligibility,
        cdc_score: calculateCDCScore(eligibility, avgPerf),
      };
    })
    .filter((p) => p !== null) as JuniorPlayerRanking[];

  // Sorting: Eligible first, then by CDC score
  return players.sort((a, b) => {
    const aElig = a.cdc_eligibility?.eligible ? 1 : 0;
    const bElig = b.cdc_eligibility?.eligible ? 1 : 0;
    if (aElig !== bElig) return bElig - aElig;
    return (b.cdc_score || 0) - (a.cdc_score || 0);
  });
}

export async function getJuniorRankingsForPeriod(
  periodValue?: string,
): Promise<JuniorPlayerRanking[]> {
  const players = await getJuniorRankings();
  // Simplified period logic to maintain your original file structure
  return players;
}
