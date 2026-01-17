"use server";

import { createClient } from "@/utils/supabase/server";

export interface TournamentEntry {
  raw_name: string;
  tournament_id: string | null;
  tournament_name: string | null;
  tournament_date: string | null;
  player_rating: number | null;
  performance_rating: number | null;
  confidence: string | null;
  tie_breaks: Record<string, number | string>;
  classifications: Record<string, string>;
  created_at: string | null;
}

export interface PlayerRanking {
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
  age_group: string | null; // U20/U18/... computed once per player
  sex: string | null;
}

export interface RankingFilters {
  name?: string;
  fed?: string;
  ageGroup?: string;
  rating?: string;
  gender?: string;
  events?: string;
  period?: string;
}

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
  // Use exact UNIQUE_NO semantics with minor trim of surrounding whitespace only
  return String(v ?? "").trim();
}

function normalizeName(first: any, last: any): string {
  const f = String(first ?? "").trim().toLowerCase();
  const l = String(last ?? "").trim().toLowerCase();
  return `${f} ${l}`.trim().replace(/\s+/g, " ");
}

function normalizeDateKey(raw: any): string {
  const d = parseBirthDate(raw);
  if (!d) return "";
  const yyyy = d.getFullYear().toString().padStart(4, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseBirthDate(raw: any): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Try native parse first
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return new Date(n);
  // Try common formats: DD/MM/YYYY, DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Try YYYY/MM/DD, YYYY-MM-DD without timezone
  const m2 = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m2) {
    const [_, yyyy, mm, dd] = m2;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function computeAgeYears(bdateRaw: any, now: Date = new Date()): number | null {
  const d = parseBirthDate(bdateRaw);
  if (!d) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function deriveAgeGroup(age: number | null): string | null {
  if (age == null) return null;

  // Assign the most specific age group label for display purposes.
  // The checks are ordered from oldest to youngest.
  if (age >= 60) return 'VET'; // Veterans are 60+
  if (age >= 50) return 'SNR'; // Seniors are 50-59
  if (age >= 20) return 'ADT'; // Adults are 20-49

  // Youth categories with specific, non-overlapping ranges for display.
  if (age >= 17 && age <= 19) return 'U20';
  if (age >= 15 && age <= 16) return 'U18';
  if (age >= 13 && age <= 14) return 'U16';
  if (age >= 11 && age <= 12) return 'U14';
  if (age >= 9 && age <= 10) return 'U12';
  if (age >= 7 && age <= 8) return 'U10';

  return null;
}

async function fetchAllProfilesBatched(supabase: any, pageSize = 1000): Promise<any[]> {
  // PostgREST enforces max-rows per response (commonly 1000). To fetch everything
  // without RPC/migrations, we must page on the server action and aggregate here.
  // This runs ONCE at page load; client filters do not re-invoke it.
  const all: any[] = [];
  let from = 0;
  let requests = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("active_players_august_2025_profiles")
      .select("*")
      .range(from, to);
    requests++;
    if (error) throw error;
    const batch = (data ?? []) as any[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
    return all;
}

async function fetchViaRPC(supabase: any): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.rpc('rankings_aggregate_all');
    if (error) {
      console.warn('[rankings] RPC rankings_aggregate_all failed:', error.message);
      return null;
    }
    // When RPC is available, it already returns one row per player with tournaments aggregated
    if (!Array.isArray(data)) return null;
    // Map RPC rows back to the same row shape used for grouping fallback
    // We'll convert RPC rows into a synthetic "rows" array by expanding tournaments
    const expanded: any[] = [];
    for (const r of data as any[]) {
      const tList = (r.tournaments ?? []) as any[];
      if (tList.length === 0) {
        expanded.push({
          UNIQUE_NO: r.unique_no,
          FIRSTNAME: r.firstname,
          SURNAME: r.surname,
          FED: r.fed,
          SEX: r.sex,
          BDATE: r.bdate,
          name: null,
          tournament_id: null,
          tournament_name: null,
          player_rating: null,
          performance_rating: r.avg_performance_rating,
          confidence: null,
          tie_breaks: null,
          classifications: null,
          created_at: null,
        });
      } else {
        for (const t of tList) {
          expanded.push({
            UNIQUE_NO: r.unique_no,
            FIRSTNAME: r.firstname,
            SURNAME: r.surname,
            FED: r.fed,
            SEX: r.sex,
            BDATE: r.bdate,
            name: t.raw_name ?? null,
            tournament_id: t.tournament_id ?? null,
            tournament_name: t.tournament_name ?? null,
            player_rating: t.player_rating ?? null,
            performance_rating: t.performance_rating ?? null,
            confidence: t.confidence ?? null,
            tie_breaks: t.tie_breaks ?? null,
            classifications: t.classifications ?? null,
            created_at: t.created_at ?? null,
          });
        }
      }
    }
        return expanded;
  } catch (e) {
    console.warn('[rankings] RPC call threw:', e);
    return null;
  }
}

export async function getRankings(): Promise<PlayerRanking[]> {
  const supabase = await createClient();

  let rows: any[] = [];
  // Prefer RPC (one call, pre-aggregated). Fallback to full-table fetch if RPC is not present.
  const rpcRows = await fetchViaRPC(supabase);
  if (rpcRows) {
    rows = rpcRows;
  } else {
    try {
      rows = await fetchAllProfilesBatched(supabase);
    } catch (e) {
      console.error("[rankings] Error fetching all rows from active_players_august_2025_profiles:", e);
      return [];
    }
  }
  
  // Fetch tournament dates for all unique tournament IDs
  const tournamentIds = Array.from(new Set(
    rows
      .map(r => r["tournament_id"])
      .filter((id): id is string => id != null && id !== "")
  ));

  const tournamentDatesMap = new Map<string, string>();
  if (tournamentIds.length > 0) {
    // Fetch from both tournaments and team_tournaments tables
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, date")
      .in("id", tournamentIds);

    const { data: teamTournamentData, error: teamTournamentError } = await supabase
      .from("team_tournaments")
      .select("id, date")
      .in("id", tournamentIds);

    if (tournamentError) {
      console.error("[rankings] Error fetching tournament dates:", tournamentError);
    } else if (tournamentData) {
      for (const t of tournamentData) {
        if (t.id && t.date) {
          tournamentDatesMap.set(t.id, t.date);
        }
      }
          }

    if (teamTournamentError) {
      console.error("[rankings] Error fetching team tournament dates:", teamTournamentError);
    } else if (teamTournamentData) {
      for (const t of teamTournamentData) {
        if (t.id && t.date) {
          tournamentDatesMap.set(t.id, t.date);
        }
      }
          }
  }

  // Group strictly by UNIQUE_NO
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = normalizeUniqueNo(r["UNIQUE_NO"]);
    if (!key) continue; // as per requirement: all players have a UNIQUE_NO
    const arr = groups.get(key);
    if (arr) arr.push(r); else groups.set(key, [r]);
  }
  
  const groupKeys = Array.from(groups.keys());

  // Aggregate each group into a single player record (one instance)
  const players: PlayerRanking[] = groupKeys.map((key) => {
    const gr = groups.get(key)!;

    // Build per-tournament entries (keep raw rows for the details modal)
    let tournaments: TournamentEntry[] = gr.map((r) => {
      const tournamentId = (r["tournament_id"] ?? null) as string | null;
      const tournamentDate = tournamentId ? (tournamentDatesMap.get(tournamentId) ?? null) : null;

      return {
        raw_name: String(r["name"] ?? ""),
        tournament_id: tournamentId,
        tournament_name: (r["tournament_name"] ?? null) as string | null,
        tournament_date: tournamentDate,
        player_rating: safeNumber(r["player_rating"]) ?? safeNumber(r["RATING"]),
        performance_rating: safeNumber(r["performance_rating"]) ?? 0, // treat null as 0
        confidence: (r["confidence"] ?? null) as string | null,
        tie_breaks: tryParseJSON<Record<string, number | string>>(r["tie_breaks"], {}),
        classifications: tryParseJSON<Record<string, string>>(r["classifications"], {}),
        created_at: (r["created_at"] ?? null) as string | null,
      };
    });

    // Filter tournaments by season period when provided via env or caller
    // Default: include all. Caller may pass desired period via global PROCESS env or by modifying this function.
    // NOTE: Page-level filtering is also applied client-side; here we do not force a period by default.
    // If you need a default season enforced server-side, call getRankingsWithPeriod helper instead.

    // Sort tournaments by created_at descending when available
    tournaments.sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      return bt - at;
    });

    // Derive top-level fields from most recent group row
    const latestRow = gr
      .slice()
      .sort((a, b) => {
        const at = a["created_at"] ? Date.parse(String(a["created_at"])) : 0;
        const bt = b["created_at"] ? Date.parse(String(b["created_at"])) : 0;
        return bt - at;
      })[0] ?? gr[0];

    const first = String(latestRow["FIRSTNAME"] ?? "");
    const last = String(latestRow["SURNAME"] ?? "");

    // Average performance rating: include 0 for nulls, divide by ALL instances
    const perfSum = tournaments.reduce((sum, t) => sum + (t.performance_rating ?? 0), 0);
    const avgPerf = Number((perfSum / (tournaments.length || 1)).toFixed(2));

    const ageYears = computeAgeYears(latestRow["BDATE"]);
    const ageGroup = deriveAgeGroup(ageYears);

    const p: PlayerRanking = {
      name_key: key,
      display_name: `${first} ${last}`.trim(),
      name: first,
      surname: last,
      rating: tournaments[0]?.player_rating ?? safeNumber(latestRow["RATING"]) ?? null,
      fed: (latestRow["FED"] ?? null) as string | null,
      avg_performance_rating: avgPerf,
      tournaments_count: tournaments.length,
      tournaments,
      bdate_raw: (latestRow["BDATE"] ?? null) as string | null,
      age_years: ageYears,
      age_group: ageGroup,
      sex: (latestRow["SEX"] ?? null) as string | null,
    };

    return p;
  });


  // Sort by average TP (APR) descending using same calculation as table display
  const getDisplayAPR = (player: PlayerRanking): number => {
    const playedTournaments = player.tournaments.filter(tournament => {
      const tieBreaks = tournament.tie_breaks || {}
      const hasValidTieBreaks = Object.values(tieBreaks).some(value =>
        value !== null && value !== undefined && value !== "" && value !== 0
      )
      return hasValidTieBreaks && tournament.performance_rating
    })

    const validPerformanceRatings = playedTournaments
      .map(t => t.performance_rating)
      .filter((rating): rating is number => rating !== null && rating !== undefined)

    return validPerformanceRatings.length > 0
      ? validPerformanceRatings.reduce((sum, rating) => sum + rating, 0) / validPerformanceRatings.length
      : 0
  }

  const sorted = players.sort((a, b) => getDisplayAPR(b) - getDisplayAPR(a));

  return sorted;
}

// Helper: return rankings filtered to a specific period value (e.g., '2025-2026')
export async function getRankingsForPeriod(periodValue?: string): Promise<PlayerRanking[]> {
  const PERIODS: Record<string, { start: string; end: string }> = {
    '2024-2025': { start: '2024-10-01', end: '2025-09-30' },
    '2025-2026': { start: '2025-10-01', end: '2026-09-30' },
  }

  const players = await getRankings()

  if (!periodValue || !PERIODS[periodValue]) return players

  const { start, end } = PERIODS[periodValue]

  const inPeriod = (dateStr: string | null) => {
    if (!dateStr) return false
    const d = dateStr.split('T')[0] // normalize
    return d >= start && d <= end
  }

  // For each player, filter tournaments and recompute avg_performance_rating and tournaments_count
  const transformed = players.map((p) => {
    const filteredTournaments = p.tournaments.filter((t) => inPeriod(t.tournament_date))

    const validPerformanceRatings = filteredTournaments
      .filter((t) => {
        const tieBreaks = t.tie_breaks || {}
        const hasValidTieBreaks = Object.values(tieBreaks).some(v => v !== null && v !== undefined && v !== '' && v !== 0)
        return hasValidTieBreaks && t.performance_rating
      })
      .map((t) => t.performance_rating as number)

    const avg = validPerformanceRatings.length > 0 ? validPerformanceRatings.reduce((s, r) => s + r, 0) / validPerformanceRatings.length : 0

    return {
      ...p,
      tournaments: filteredTournaments,
      tournaments_count: filteredTournaments.length,
      avg_performance_rating: Number(avg.toFixed(2)),
    }
  })

  // Sort by new APR
  transformed.sort((a, b) => (b.avg_performance_rating || 0) - (a.avg_performance_rating || 0))

  return transformed
}